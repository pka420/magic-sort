import { request } from './client'

export interface LeaderboardEntry {
  readonly rank: number
  readonly username: string
  readonly total: number
}

export function fetchLeaderboard(levelId: number): Promise<LeaderboardEntry[]> {
  return request(`/leaderboard/${levelId}`)
}

export function submitScore(
  token: string,
  levelId: number,
  total: number
): Promise<{ total: number }> {
  return request('/scores', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ level_id: levelId, total })
  })
}
