import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Leaderboard } from './Leaderboard'
import type { Leaderboard as Board } from '../hooks/useLeaderboard'

function makeBoard(overrides: Partial<Board> = {}): Board {
  return {
    entries: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
    submit: vi.fn(),
    ...overrides
  }
}

const open = async (
  board: Board,
  props: Partial<Parameters<typeof Leaderboard>[0]> = {}
) => {
  const user = userEvent.setup()
  render(
    <Leaderboard board={board} username={null} isVerified={false} {...props} />
  )
  await user.click(screen.getByRole('button', { name: 'Leaderboard' }))
  return user
}

describe('Leaderboard', () => {
  it('fetches the board when its button is pressed', async () => {
    const board = makeBoard()
    await open(board)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(board.refresh).toHaveBeenCalledTimes(1)
  })

  it('lists players by rank, name and score', async () => {
    const board = makeBoard({
      entries: [
        { rank: 1, username: 'bob', total: 9000 },
        { rank: 2, username: 'alice', total: 5000 }
      ]
    })
    await open(board, { username: 'alice' })

    const rows = screen.getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('1bob9,000')
    expect(rows[1]).toHaveTextContent('2alice5,000')
  })

  it('marks the signed-in player own row', async () => {
    const board = makeBoard({
      entries: [{ rank: 1, username: 'alice', total: 5000 }]
    })
    await open(board, { username: 'alice' })

    expect(screen.getByRole('listitem')).toHaveClass('leaderboard__row--mine')
  })

  it('tells a player there is nothing to see when the board is empty', async () => {
    await open(makeBoard())

    expect(
      screen.getByText('No scores yet. Finish the campaign to take a place.')
    ).toBeInTheDocument()
  })

  it('says so while the board is being fetched', async () => {
    await open(makeBoard({ loading: true }))

    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('warns an unverified player that their score is hidden', async () => {
    await open(makeBoard(), { username: 'alice', isVerified: false })

    expect(
      screen.getByText('Your scores stay hidden until your email is verified.')
    ).toBeInTheDocument()
  })

  it('closes on Escape', async () => {
    const board = makeBoard()
    const user = await open(board)

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('closes when Close is pressed', async () => {
    const board = makeBoard()
    const user = await open(board)

    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })
})
