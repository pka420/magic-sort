import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuth } from './useAuth'
import {
  fetchMe,
  login as apiLogin,
  register as apiRegister,
  setUsername as apiSetUsername
} from '../api/auth'
import { lendStorage } from '../test/storage'

vi.mock('../api/auth', () => ({
  fetchMe: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  setUsername: vi.fn(),
  googleAuthorizeUrl: () => '/api/auth/google/authorize'
}))

const TOKEN_KEY = 'magic-sort:token'

const alice = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  isVerified: false,
  authProvider: 'local'
}

beforeEach(() => {
  lendStorage()
  vi.mocked(fetchMe).mockReset()
  vi.mocked(apiLogin).mockReset()
  vi.mocked(apiRegister).mockReset()
  vi.mocked(apiSetUsername).mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useAuth', () => {
  it('is signed out when no token is stored', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toBeNull()
    expect(result.current.resolving).toBe(false)
  })

  it('picks a stored session back up', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'tok')
    vi.mocked(fetchMe).mockResolvedValue(alice)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user).toEqual(alice))
    expect(result.current.resolving).toBe(false)
  })

  /* A token the server no longer honours is dropped, not clung to. */
  it('signs a player out when their stored token is refused', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'stale')
    vi.mocked(fetchMe).mockRejectedValue(new Error('Unauthorized'))

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.resolving).toBe(false))
    expect(result.current.user).toBeNull()
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('signs the player in and keeps the token', async () => {
    vi.mocked(apiLogin).mockResolvedValue({ accessToken: 'tok', user: alice })
    const { result } = renderHook(() => useAuth())

    await act(() => result.current.login('alice@example.com', 'password123'))

    expect(vi.mocked(apiLogin)).toHaveBeenCalledWith(
      'alice@example.com',
      'password123'
    )
    expect(result.current.user).toEqual(alice)
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('tok')
  })

  it('registers an account without signing it in', async () => {
    vi.mocked(apiRegister).mockResolvedValue(undefined)
    const { result } = renderHook(() => useAuth())

    await act(() =>
      result.current.register('alice', 'alice@example.com', 'password123')
    )

    expect(vi.mocked(apiRegister)).toHaveBeenCalledWith(
      'alice',
      'alice@example.com',
      'password123'
    )
    expect(result.current.user).toBeNull()
  })

  it('keeps the name a Google sign-in leaves in the address bar', async () => {
    vi.mocked(fetchMe).mockResolvedValue({ ...alice, username: null })
    window.location.hash = '#access_token=fresh'

    const { result } = renderHook(() => useAuth())

    await waitFor(() => expect(result.current.user?.username).toBeNull())
    expect(window.localStorage.getItem(TOKEN_KEY)).toBe('fresh')
    expect(window.location.hash).toBe('')
  })

  it('saves a chosen username', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'tok')
    vi.mocked(fetchMe).mockResolvedValue({ ...alice, username: null })
    vi.mocked(apiSetUsername).mockResolvedValue(alice)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user?.username).toBeNull())

    await act(() => result.current.chooseUsername('alice'))

    expect(vi.mocked(apiSetUsername)).toHaveBeenCalledWith('tok', 'alice')
    expect(result.current.user?.username).toBe('alice')
  })

  it('signs out and forgets the token', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'tok')
    vi.mocked(fetchMe).mockResolvedValue(alice)

    const { result } = renderHook(() => useAuth())
    await waitFor(() => expect(result.current.user).toEqual(alice))

    act(() => result.current.signOut())

    expect(result.current.user).toBeNull()
    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})
