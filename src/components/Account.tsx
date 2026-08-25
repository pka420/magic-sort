import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Auth } from '../hooks/useAuth'
import type { AuthUser } from '../api/auth'

interface AccountProps {
  readonly auth: Auth
}

/*
 * The player's corner of the drawer. It speaks for the session: who is signed
 * in, or the way to become so. It is pure presentation — the session lives in
 * useAuth, handed in as a prop — so the same state drives whatever else later
 * needs to know who is playing.
 */
export function Account({ auth }: AccountProps) {
  if (auth.resolving) {
    return <p className='account__status'>Checking who you are…</p>
  }

  if (auth.user === null) return <SignedOut auth={auth} />

  return <SignedIn auth={auth} user={auth.user} />
}

type Mode = 'signin' | 'register' | 'forgot'

function SignedOut({ auth }: { auth: Auth }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setNotice(null)
    setError(null)
    setBusy(true)
    try {
      if (mode === 'register') {
        await auth.register(username, email, password)
        setNotice(
          'Account created. Check your email to verify it, then sign in.'
        )
        setPassword('')
        setMode('signin')
      } else if (mode === 'forgot') {
        await auth.forgotPassword(email)
        setNotice('If that email exists, a reset link has been sent.')
        setMode('signin')
      } else {
        await auth.login(email, password)
      }
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  const goTo = (next: Mode) => {
    setMode(next)
    setNotice(null)
    setError(null)
  }

  const switchMode = () => {
    goTo(mode === 'register' ? 'signin' : 'register')
  }

  return (
    <form className='account' onSubmit={submit}>
      <h2 className='account__title'>
        {mode === 'register'
          ? 'Make an account'
          : mode === 'forgot'
            ? 'Reset your password'
            : 'Sign in'}
      </h2>

      {mode === 'register' && (
        <label className='account__field'>
          Username
          <input
            name='username'
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete='username'
            minLength={3}
            maxLength={30}
            required
          />
        </label>
      )}

      <label className='account__field'>
        Email
        <input
          type='email'
          name='email'
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete='email'
          required
        />
      </label>

      {mode !== 'forgot' && (
        <label className='account__field'>
          Password
          <input
            type='password'
            name='password'
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={
              mode === 'register' ? 'new-password' : 'current-password'
            }
            minLength={8}
            required
          />
        </label>
      )}

      {notice !== null && <p className='account__note'>{notice}</p>}
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
        {busy
          ? 'Please wait…'
          : mode === 'register'
            ? 'Create account'
            : mode === 'forgot'
              ? 'Send reset link'
              : 'Sign in'}
      </button>

      {mode === 'forgot' ? (
        <button
          type='button'
          className='button button--quiet'
          onClick={() => goTo('signin')}
        >
          Back to sign in
        </button>
      ) : (
        <>
          <button
            type='button'
            className='button button--quiet'
            onClick={switchMode}
          >
            {mode === 'register'
              ? 'Already have an account?'
              : 'New here? Make an account'}
          </button>

          <button
            type='button'
            className='button button--quiet'
            onClick={() => goTo('forgot')}
          >
            Forgot your password?
          </button>
        </>
      )}

      <button type='button' className='button' onClick={auth.signInWithGoogle}>
        Sign in with Google
      </button>
    </form>
  )
}

function SignedIn({ auth, user }: { auth: Auth; user: AuthUser }) {
  if (user.username === null) return <ChooseUsername auth={auth} />

  return (
    <div className='account'>
      <h2 className='account__title'>Signed in as {user.username}</h2>

      {!user.isVerified && <Unverified auth={auth} email={user.email} />}

      <button
        type='button'
        className='button button--quiet'
        onClick={auth.signOut}
      >
        Sign out
      </button>
    </div>
  )
}

function Unverified({ auth, email }: { auth: Auth; email: string | null }) {
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const resend = async () => {
    setNotice(null)
    setError(null)
    setBusy(true)
    try {
      await auth.resendVerification()
      setNotice(
        email === null ? 'Verification email sent.' : `Sent to ${email}.`
      )
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className='account__note'>
        Verify your email to appear on the leaderboard.
      </p>

      {notice !== null && <p className='account__note'>{notice}</p>}
      {error !== null && (
        <p className='account__error' role='alert'>
          {error}
        </p>
      )}

      <button
        type='button'
        className='button button--quiet'
        disabled={busy}
        onClick={resend}
      >
        {busy ? 'Sending…' : 'Resend verification email'}
      </button>
    </>
  )
}

function ChooseUsername({ auth }: { auth: Auth }) {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await auth.chooseUsername(username)
    } catch (cause) {
      setError(messageOf(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className='account' onSubmit={submit}>
      <h2 className='account__title'>Choose a name</h2>
      <p className='account__note'>This is the name on the leaderboard.</p>

      <label className='account__field'>
        Username
        <input
          name='username'
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete='username'
          minLength={3}
          maxLength={30}
          required
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
        Keep it
      </button>
    </form>
  )
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}
