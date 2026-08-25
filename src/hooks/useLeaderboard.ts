import { useCallback, useState } from 'react'
import {
  fetchLeaderboard,
  submitScore,
  type LeaderboardEntry
} from '../api/leaderboard'
import type { Auth } from './useAuth'

export interface Leaderboard {
  readonly entries: LeaderboardEntry[]
  readonly loading: boolean
  readonly error: string | null
  /** Fetches the board afresh; called when the board is opened. */
  refresh: () => void
  /** Posts the player's total. A no-op while signed out, and never throws. */
  submit: (total: number) => void
}

export function useLeaderboard(auth: Auth): Leaderboard {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(() => {
    setLoading(true)
    setError(null)
    fetchLeaderboard()
      .then(setEntries)
      .catch((cause: unknown) => setError(messageOf(cause)))
      .finally(() => setLoading(false))
  }, [])

  const submit = useCallback(
    (total: number) => {
      if (auth.token === null) return
      // Posting a score must never interrupt the game behind it.
      submitScore(auth.token, total).catch(() => {})
    },
    [auth.token]
  )

  return { entries, loading, error, refresh, submit }
}

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong'
}
