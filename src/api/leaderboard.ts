import { request } from './client'

export interface LeaderboardEntry {
  readonly rank: number
  readonly username: string
  readonly total: number
}

export function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  return request('/leaderboard')
}

export function submitScore(
  token: string,
  total: number
): Promise<{ total: number }> {
  return request('/scores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ total })
  })
}
