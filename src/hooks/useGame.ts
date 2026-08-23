import { useCallback, useEffect, useState } from 'react'
import {
  canPourBetween,
  completedFlaskCount,
  flasksToFill,
  isSolved,
  pourBetween
} from '../domain/board'
import { isComplete, isEmpty } from '../domain/flask'
import { scoreFor } from '../domain/scoring'
import { readSavedRun, rememberProgress } from '../storage/savedRun'
import type { Board } from '../domain/board'
import type { Level } from '../domain/levels'

export type TapOutcome =
  'ignored' | 'picked-up' | 'put-down' | 'poured' | 'refused'

export interface LastTap {
  readonly outcome: TapOutcome
  /** Rises on every tap, so repeats of the same outcome still re-fire effects. */
  readonly sequence: number
  /** The flask this tap filled to the brim, if it filled one. */
  readonly completedFlaskIndex: number | null
  /** The flask that turned this pour away, if one did. */
  readonly refusedFlaskIndex: number | null
}

export interface Game {
  readonly board: Board
  readonly selectedIndex: number | null
  readonly pours: number
  readonly score: number
  readonly isSolved: boolean
  readonly lastTap: LastTap
  /** Whether there is a pour on the board left to take back. */
  readonly canUndo: boolean
  /** The one gesture the game understands: pick a flask up, or pour it out. */
  tapFlask: (index: number) => void
  /** Takes back the last pour, and the pour it spent with it. */
  undo: () => void
  restart: () => void
}

/** The board as it stood before the pour that can still be taken back. */
interface Undoable {
  readonly board: Board
  readonly pours: number
}

interface Session {
  /** The level this board was laid out from, so a new one can be spotted. */
  readonly level: Level
  readonly board: Board
  readonly selectedIndex: number | null
  readonly pours: number
  readonly lastTap: LastTap
  /** One pour back, which is as far as changing your mind reaches. */
  readonly previous: Undoable | null
}

/**
 * The level in play. The worth is handed in rather than read off the level,
 * because what a level pays is its place in the campaign rather than anything
 * about the glass on it: the same board pays more the later it is met.
 */
export function useGame(level: Level, worth: number): Game {
  // Only a first render looks for a saved session. Every other way of arriving
  // at one — moving on, restarting, playing again — is asking for a board laid
  // out afresh, and would be wrong to hand back a half-solved one.
  const [session, setSession] = useState(
    () => savedSession(level) ?? sessionFor(level)
  )

  // A different level is a different session, not a continuation of this one:
  // moving on has to arrive at a full board with no pours spent.
  if (session.level !== level) setSession(sessionFor(level))

  useEffect(() => {
    rememberProgress({
      levelId: session.level.id,
      board: session.board,
      pours: session.pours
    })
  }, [session.level.id, session.board, session.pours])

  const tapFlask = useCallback((index: number) => {
    setSession((current) => tap(current, index))
  }, [])

  const undo = useCallback(() => {
    setSession(takeBack)
  }, [])

  const restart = useCallback(() => {
    setSession(sessionFor(level))
  }, [level])

  const solved = isSolved(session.board)
  const score = scoreFor({
    completedFlasks: completedFlaskCount(session.board),
    flasksToFill: flasksToFill(session.board),
    pours: session.pours,
    minimumPours: level.minimumPours,
    worth,
    solved
  })

  return {
    board: session.board,
    selectedIndex: session.selectedIndex,
    pours: session.pours,
    score,
    isSolved: solved,
    lastTap: session.lastTap,
    canUndo: session.previous !== null,
    tapFlask,
    undo,
    restart
  }
}

/**
 * The board the player walked away from, if it belongs to the level in front
 * of them now. A save from another level is left alone: the campaign is the
 * only thing that decides which level this is.
 */
function savedSession(level: Level): Session | null {
  const saved = readSavedRun()?.progress
  if (saved === null || saved === undefined) return null
  if (saved.levelId !== level.id) return null

  /* A board carried in from a save has no pour of this visit to take back. */
  return { ...sessionFor(level), board: saved.board, pours: saved.pours }
}

function sessionFor(level: Level): Session {
  return {
    level,
    board: level.board,
    selectedIndex: null,
    pours: 0,
    lastTap: {
      outcome: 'ignored',
      sequence: 0,
      completedFlaskIndex: null,
      refusedFlaskIndex: null
    },
    previous: null
  }
}

function tap(session: Session, index: number): Session {
  const sequence = session.lastTap.sequence + 1
  const quietTap = {
    sequence,
    completedFlaskIndex: null,
    refusedFlaskIndex: null
  }

  if (session.selectedIndex === null) {
    const picked = pickUp(session.board, index)
    return {
      ...session,
      selectedIndex: picked,
      lastTap: {
        ...quietTap,
        outcome: picked === null ? 'ignored' : 'picked-up'
      }
    }
  }

  if (session.selectedIndex === index) {
    return {
      ...session,
      selectedIndex: null,
      lastTap: { ...quietTap, outcome: 'put-down' }
    }
  }

  if (!canPourBetween(session.board, session.selectedIndex, index)) {
    return {
      ...session,
      selectedIndex: null,
      lastTap: { ...quietTap, outcome: 'refused', refusedFlaskIndex: index }
    }
  }

  const board = pourBetween(session.board, session.selectedIndex, index)

  return {
    ...session,
    board,
    selectedIndex: null,
    pours: session.pours + 1,
    /* The pour that made this board is the one an undo reaches back to. */
    previous: { board: session.board, pours: session.pours },
    lastTap: {
      ...quietTap,
      outcome: 'poured',
      // Only the flask receiving the pour can have just been filled.
      completedFlaskIndex: isComplete(board[index]) ? index : null
    }
  }
}

/**
 * The last pour, taken back. The score needs no refund of its own: it is
 * counted from the board and the pours, so it climbs back on its own. The tap
 * is reported as ignored rather than poured, so nothing plays it backwards.
 */
function takeBack(session: Session): Session {
  if (session.previous === null) return session

  return {
    ...session,
    board: session.previous.board,
    pours: session.previous.pours,
    selectedIndex: null,
    previous: null,
    lastTap: {
      outcome: 'ignored',
      sequence: session.lastTap.sequence + 1,
      completedFlaskIndex: null,
      refusedFlaskIndex: null
    }
  }
}

function pickUp(board: Board, index: number): number | null {
  const flask = board[index]
  if (flask === undefined || isEmpty(flask) || isComplete(flask)) return null
  return index
}
