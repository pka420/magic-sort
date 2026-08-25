import { request } from './client'

/* The API answers in snake_case; the app speaks camelCase. This boundary is
 * where the two shake hands, so nothing above it has to know. */

interface UserPayload {
  readonly id: number
  readonly username: string | null
  readonly email: string | null
  readonly is_verified: boolean
  readonly auth_provider: string
}

export interface AuthUser {
  readonly id: number
  readonly username: string | null
  readonly email: string | null
  readonly isVerified: boolean
  readonly authProvider: string
}

export interface TokenResponse {
  readonly accessToken: string
  readonly user: AuthUser
}

export function register(
  username: string,
  email: string,
  password: string
): Promise<void> {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password })
  })
}

export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const body = await request<{ access_token: string; user: UserPayload }>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }
  )

  return { accessToken: body.access_token, user: toUser(body.user) }
}

export async function fetchMe(token: string): Promise<AuthUser> {
  return toUser(await request<UserPayload>('/auth/me', authed(token)))
}

export async function setUsername(
  token: string,
  username: string
): Promise<AuthUser> {
  return toUser(
    await request<UserPayload>('/auth/username', {
      ...authed(token),
      method: 'POST',
      body: JSON.stringify({ username })
    })
  )
}

/** Where the browser is sent to begin a "Sign in with Google" round trip. */
export function googleAuthorizeUrl(): string {
  return '/api/auth/google/authorize'
}

function authed(token: string): RequestInit {
  return { headers: { Authorization: `Bearer ${token}` } }
}

function toUser(payload: UserPayload): AuthUser {
  return {
    id: payload.id,
    username: payload.username,
    email: payload.email,
    isVerified: payload.is_verified,
    authProvider: payload.auth_provider
  }
}
