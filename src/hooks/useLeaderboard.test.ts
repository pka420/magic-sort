import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useLeaderboard } from './useLeaderboard'
import { fetchLeaderboard, submitScore } from '../api/leaderboard'
import type { Auth } from './useAuth'

vi.mock('../api/leaderboard', () => ({
  fetchLeaderboard: vi.fn(),
  submitScore: vi.fn()
}))

const signedOut: Auth = {
  user: null,
  token: null,
  resolving: false,
  login: vi.fn(),
  register: vi.fn(),
  signInWithGoogle: vi.fn(),
  chooseUsername: vi.fn(),
  signOut: vi.fn()
}

const alice = { rank: 1, username: 'alice', total: 900 }

beforeEach(() => {
  vi.mocked(fetchLeaderboard).mockReset()
  vi.mocked(submitScore).mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useLeaderboard', () => {
  it('holds nothing until it is asked to fetch', () => {
    const { result } = renderHook(() => useLeaderboard(signedOut))

    expect(result.current.entries).toEqual([])
    expect(fetchLeaderboard).not.toHaveBeenCalled()
  })

  it('fetches the board when refreshed', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue([alice])
    const { result } = renderHook(() => useLeaderboard(signedOut))

    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.entries).toEqual([alice]))
    expect(result.current.loading).toBe(false)
  })

  it('carries what the server said when the board cannot be reached', async () => {
    vi.mocked(fetchLeaderboard).mockRejectedValue(new Error('Offline'))
    const { result } = renderHook(() => useLeaderboard(signedOut))

    act(() => result.current.refresh())

    await waitFor(() => expect(result.current.error).toBe('Offline'))
  })

  it('posts a signed-in player score', () => {
    vi.mocked(submitScore).mockResolvedValue({ total: 900 })
    const auth = { ...signedOut, token: 'tok' }
    const { result } = renderHook(() => useLeaderboard(auth))

    act(() => result.current.submit(900))

    expect(submitScore).toHaveBeenCalledWith('tok', 900)
  })

  it('stays silent when there is nobody signed in', () => {
    const { result } = renderHook(() => useLeaderboard(signedOut))

    act(() => result.current.submit(900))

    expect(submitScore).not.toHaveBeenCalled()
  })
})
