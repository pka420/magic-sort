import { useCallback, useEffect, useState } from 'react'
import {
  fetchMe,
  forgotPassword as apiForgotPassword,
  googleAuthorizeUrl,
  login as apiLogin,
  register as apiRegister,
  resendVerification as apiResendVerification,
  resetPassword as apiResetPassword,
  setUsername as apiSetUsername,
  verifyEmail as apiVerifyEmail,
  type AuthUser
} from '../api/auth'

const KEPT_AS = 'magic-sort:token'
const FRAGMENT = '#access_token='

export interface Auth {
  /** Who is signed in, once the server has said so. Null until then. */
  readonly user: AuthUser | null
  /** The bearer token, for the calls that need it. Null while signed out. */
  readonly token: string | null
  /** True while a stored token is being checked against the server. */
  readonly resolving: boolean
  login: (email: string, password: string) => Promise<void>
  register: (username: string, email: string, password: string) => Promise<void>
  signInWithGoogle: () => void
  chooseUsername: (username: string) => Promise<void>
  verifyEmail: (token: string) => Promise<void>
  resendVerification: () => Promise<void>
  forgotPassword: (email: string) => Promise<void>
  resetPassword: (token: string, newPassword: string) => Promise<void>
  signOut: () => void
}

export function useAuth(): Auth {
  /* A Google sign-in leaves the token in the URL fragment, where a server log
   * never sees it. Read it here, before any render shows a signed-out player. */
  const [token, setToken] = useState<string | null>(
    () => tokenFromLocation() ?? readStoredToken()
  )
  const [user, setUser] = useState<AuthUser | null>(null)
  const [resolving, setResolving] = useState<boolean>(token !== null)

  /* Keep the token somewhere durable and tidy the address bar. No state is set
   * here: the token above already holds it. */
  useEffect(() => {
    const fresh = tokenFromLocation()
    if (fresh !== null) storeToken(fresh)
    clearTokenFromLocation()
  }, [])

  /* A token is only as good as the server still thinks it is: ask once, and
   * drop it the moment it is refused. */
  useEffect(() => {
    if (token === null || user !== null) return

    let cancelled = false
    fetchMe(token)
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (cancelled) return
        forgetToken()
        setToken(null)
      })
      .finally(() => {
        if (!cancelled) setResolving(false)
      })

    return () => {
      cancelled = true
    }
  }, [token, user])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiLogin(email, password)
    storeToken(response.accessToken)
    setToken(response.accessToken)
    setUser(response.user)
  }, [])

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await apiRegister(username, email, password)
    },
    []
  )

  const signInWithGoogle = useCallback(() => {
    window.location.assign(googleAuthorizeUrl())
  }, [])

  const chooseUsername = useCallback(
    async (username: string) => {
      if (token === null) return
      setUser(await apiSetUsername(token, username))
    },
    [token]
  )

  /* A verification link is followed in whatever browser the player opened
   * their mail in, so the confirmed flag is refreshed only when they are
   * actually signed in here. */
  const verifyEmail = useCallback(
    async (verificationToken: string) => {
      await apiVerifyEmail(verificationToken)
      if (token === null) return
      setUser(await fetchMe(token))
    },
    [token]
  )

  const resendVerification = useCallback(async () => {
    if (token === null) return
    await apiResendVerification(token)
  }, [token])

  const forgotPassword = useCallback(async (email: string) => {
    await apiForgotPassword(email)
  }, [])

  const resetPassword = useCallback(
    async (resetToken: string, newPassword: string) => {
      await apiResetPassword(resetToken, newPassword)
    },
    []
  )

  const signOut = useCallback(() => {
    forgetToken()
    setToken(null)
    setUser(null)
  }, [])

  return {
    user,
    token,
    resolving,
    login,
    register,
    signInWithGoogle,
    chooseUsername,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    signOut
  }
}

function readStoredToken(): string | null {
  try {
    return window.localStorage.getItem(KEPT_AS)
  } catch {
    return null
  }
}

function storeToken(token: string): void {
  try {
    window.localStorage.setItem(KEPT_AS, token)
  } catch {
    // A hardened browser holds no token at all; the session lives in memory.
  }
}

function forgetToken(): void {
  try {
    window.localStorage.removeItem(KEPT_AS)
  } catch {
    // Nothing held to forget.
  }
}

function tokenFromLocation(): string | null {
  const hash = window.location.hash
  if (!hash.startsWith(FRAGMENT)) return null
  return hash.slice(FRAGMENT.length)
}

function clearTokenFromLocation(): void {
  if (!window.location.hash.startsWith(FRAGMENT)) return
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.search
  )
}
