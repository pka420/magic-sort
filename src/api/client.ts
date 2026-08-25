/*
 * The one place the game talks to the server. Like the audio and storage
 * boundaries, it exists so the rest of the app never sees a network call and
 * tests can stub it away.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

/** A non-2xx answer, carrying the server's own message when there is one. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!response.ok) throw new ApiError(response.status, await problem(response))
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

/** Turns a failed response into something a player can be shown. */
async function problem(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown }
    if (typeof body.detail === 'string') return body.detail
  } catch {
    // Not JSON; fall through to the generic message.
  }
  return `Request failed (${response.status})`
}
