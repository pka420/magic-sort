import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Leaderboard as LeaderboardState } from '../hooks/useLeaderboard'

interface LeaderboardProps {
  /** The board to show, and the way to ask it for a fresh copy. */
  readonly board: LeaderboardState
  /** The signed-in player's name, to mark their row. Null when signed out. */
  readonly username: string | null
  /** Whether the signed-in player's scores are allowed onto the board. */
  readonly isVerified: boolean
  /** The level in play, the board opens on it by default. */
  readonly levelId: number
  /** How many levels there are, so the board can offer every one. */
  readonly levelCount: number
}

/*
 * The leaderboard, opened from its own button to the left of the menu. The
 * button is always there — anyone can read the board — and the board can page
 * through every level rather than only the one in play, so a score put up on
 * an earlier level is always findable again.
 */
export function Leaderboard({
  board,
  username,
  isVerified,
  levelId,
  levelCount
}: LeaderboardProps) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(levelId)
  const titleId = useId()

  const openDialog = () => {
    setSelected(levelId)
    setOpen(true)
    board.refresh(levelId)
  }

  const chooseLevel = (next: number) => {
    setSelected(next)
    board.refresh(next)
  }

  /* Escape closes it, the way every dialog on this screen does. */
  useEffect(() => {
    if (!open) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <>
      <button
        type='button'
        className='menu-toggle leaderboard-toggle'
        aria-label='Leaderboard'
        aria-haspopup='dialog'
        aria-expanded={open}
        onClick={openDialog}
      >
        <Trophy />
        <span className='menu-toggle__label'>Scores</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className='veil'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className='leaderboard'
              role='dialog'
              aria-modal='true'
              aria-labelledby={titleId}
              initial={{ scale: 0.92, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div
                className='leaderboard__nav'
                role='tablist'
                aria-label='Levels'
              >
                {levels(levelCount).map((id) => (
                  <button
                    key={id}
                    type='button'
                    role='tab'
                    aria-selected={id === selected}
                    className={
                      id === selected
                        ? 'leaderboard__level-btn leaderboard__level-btn--active'
                        : 'leaderboard__level-btn'
                    }
                    onClick={() => chooseLevel(id)}
                  >
                    Level {id}
                  </button>
                ))}
              </div>

              <div className='leaderboard__main'>
                <h2 className='leaderboard__title' id={titleId}>
                  Leaderboard
                </h2>

                <Board
                  board={board}
                  username={username}
                  isVerified={isVerified}
                />

                <button
                  type='button'
                  className='button button--quiet'
                  autoFocus
                  onClick={() => setOpen(false)}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/** One through `count`, the way a player counts levels. */
function levels(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

function Board({
  board,
  username,
  isVerified
}: {
  board: LeaderboardState
  username: string | null
  isVerified: boolean
}) {
  if (board.loading) {
    return <p className='leaderboard__status'>Loading…</p>
  }

  if (board.error !== null) {
    return (
      <p className='leaderboard__error' role='alert'>
        {board.error}
      </p>
    )
  }

  return (
    <>
      {username !== null && !isVerified && (
        <p className='leaderboard__note'>
          Your scores stay hidden until your email is verified.
        </p>
      )}

      {board.entries.length === 0 ? (
        <p className='leaderboard__empty'>
          No scores yet. Sort this level to take a place.
        </p>
      ) : (
        <ol className='leaderboard__list'>
          {board.entries.map((entry) => (
            <li
              key={entry.username}
              className={
                entry.username === username
                  ? 'leaderboard__row leaderboard__row--mine'
                  : 'leaderboard__row'
              }
            >
              <span className='leaderboard__rank'>{entry.rank}</span>
              <span className='leaderboard__name'>{entry.username}</span>
              <span className='leaderboard__score'>
                {entry.total.toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}

function Trophy() {
  return (
    <svg
      viewBox='0 0 24 24'
      width='18'
      height='18'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.7'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M7 4h10v4a5 5 0 0 1-10 0V4Z' />
      <path d='M7 6H4a1 1 0 0 0-1 1c0 2 1.5 4 4 4' />
      <path d='M17 6h3a1 1 0 0 1 1 1c0 2-1.5 4-4 4' />
      <path d='M12 13v4' />
      <path d='M8 21h8' />
    </svg>
  )
}
