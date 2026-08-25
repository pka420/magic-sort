import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Auth } from '../hooks/useAuth'

interface VerificationProps {
  readonly auth: Auth
}

/*
 * The mail links land here. A "verify" link confirms the address on its own;
 * a "reset" link asks for a new password. Both arrive as query parameters on
 * the frontend URL — `?verify=` and `?reset=` — and both are swept from the
 * address bar the moment they have been read, so a refresh does not fire them
 * again.
 */

type Link =
  | { readonly kind: 'verify'; readonly token: string }
  | { readonly kind: 'reset'; readonly token: string }

export function Verification({ auth }: VerificationProps) {
  const [link, setLink] = useState<Link | null>(() => linkFromLocation())

  useEffect(() => {
    if (link === null) return
    dropTokenFromLocation(link.kind)
  }, [link])

  const dismiss = () => setLink(null)

  return (
    <AnimatePresence>
      {link !== null && (
        <motion.div
          className='veil'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className='verification'
            role='dialog'
            aria-modal='true'
            initial={{ scale: 0.92, y: 18 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            {link.kind === 'verify' ? (
              <VerifyBody auth={auth} token={link.token} onDone={dismiss} />
            ) : (
              <ResetBody auth={auth} token={link.token} onDone={dismiss} />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function VerifyBody({
  auth,
  token,
  onDone
}: {
  auth: Auth
  token: string
  onDone: () => void
}) {
  const [phase, setPhase] = useState<'checking' | 'done' | 'failed'>('checking')
  const [detail, setDetail] = useState('Checking that link…')
  const verify = auth.verifyEmail

  /* StrictMode runs the effect twice in development, and a verification token
   * is spent the first time. The ref keeps the second run from firing an
   * already-used token and reporting a false failure. */
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true

    verify(token)
      .then(() => {
        setPhase('done')
        setDetail('Your scores can now reach the leaderboard.')
      })
      .catch((cause) => {
        setPhase('failed')
        setDetail(messageOf(cause))
      })
  }, [verify, token])

  return (
    <>
      <h2 className='verification__title'>
        {phase === 'checking'
          ? 'Verifying your email…'
          : phase === 'done'
            ? 'Email verified'
            : 'Could not verify'}
      </h2>

      <p className='verification__detail'>{detail}</p>

      {phase !== 'checking' && (
        <button
          type='button'
          className='button button--primary button--wide'
          autoFocus
          onClick={onDone}
        >
          Continue
        </button>
      )}
    </>
  )
}

function ResetBody({
  auth,
  token,
  onDone
}: {
  auth: Auth
  token: string
  onDone: () => void
}) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await auth.resetPassword(token, password)
      setDone(true)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <h2 className='verification__title'>
        {done ? 'Password reset' : 'Choose a new password'}
      </h2>

      {done ? (
        <>
          <p className='verification__detail'>
            Your password is reset. Sign in with it.
          </p>
          <button
            type='button'
            className='button button--primary button--wide'
            autoFocus
            onClick={onDone}
          >
            Continue
          </button>
        </>
      ) : (
        <form className='account' onSubmit={submit}>
          <label className='account__field'>
            New password
            <input
              type='password'
              name='password'
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete='new-password'
              minLength={8}
              required
              autoFocus
            />
          </label>

          {error !== null && (
            <p className='account__error' role='alert'>
              {error}
            </p>
          )}

          <button
            type='submit'
            className='button button--primary button--wide'
            disabled={busy}
          >
            {busy ? 'Please wait…' : 'Reset password'}
          </button>
        </form>
      )}
    </>
  )
}

function linkFromLocation(): Link | null {
  const params = new URLSearchParams(window.location.search)
  const verify = params.get('verify')
  if (verify !== null) return { kind: 'verify', token: verify }
  const reset = params.get('reset')
  if (reset !== null) return { kind: 'reset', token: reset }
  return null
}

function dropTokenFromLocation(kind: 'verify' | 'reset'): void {
  const url = new URL(window.location.href)
  url.searchParams.delete(kind)
  window.history.replaceState(null, '', url)
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}
