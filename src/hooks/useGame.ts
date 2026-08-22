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
import { readSavedRun, rememberBench } from '../storage/savedRun'
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
  /** The one gesture the game understands: pick a flask up, or pour it out. */
  tapFlask: (index: number) => void
  restart: () => void
}

interface Bench {
  /** The level this bench was laid out from, so a new one can be spotted. */
  readonly level: Level
  readonly board: Board
  readonly selectedIndex: number | null
  readonly pours: number
  readonly lastTap: LastTap
}

/**
 * The bench in play. The worth is handed in rather than read off the level,
 * because what a bench pays is its place in the atelier rather than anything
 * about the glass on it: the same board pays more the later it is met.
 */
export function useGame(level: Level, worth: number): Game {
  // Only a first render looks for a saved bench. Every other way of arriving
  // at one — moving on, restarting, playing again — is asking for a board laid
  // out afresh, and would be wrong to hand back a half-solved one.
  const [bench, setBench] = useState(() => savedBench(level) ?? benchFor(level))

  // A different level is a different bench, not a continuation of this one: the
  // apprentice moving on has to arrive at a full board with no pours spent.
  if (bench.level !== level) setBench(benchFor(level))

  useEffect(() => {
    rememberBench({
      levelId: bench.level.id,
      board: bench.board,
      pours: bench.pours
    })
  }, [bench.level.id, bench.board, bench.pours])

  const tapFlask = useCallback((index: number) => {
    setBench((current) => tap(current, index))
  }, [])

  const restart = useCallback(() => {
    setBench(benchFor(level))
  }, [level])

  const solved = isSolved(bench.board)
  const score = scoreFor({
    completedFlasks: completedFlaskCount(bench.board),
    flasksToFill: flasksToFill(bench.board),
    pours: bench.pours,
    minimumPours: level.minimumPours,
    worth,
    solved
  })

  return {
    board: bench.board,
    selectedIndex: bench.selectedIndex,
    pours: bench.pours,
    score,
    isSolved: solved,
    lastTap: bench.lastTap,
    tapFlask,
    restart
  }
}

/**
 * The bench the apprentice walked away from, if the one they walked away from
 * is the one in front of them now. A save from another level is left alone:
 * the campaign is the only thing that decides which bench this is.
 */
function savedBench(level: Level): Bench | null {
  const saved = readSavedRun()?.bench
  if (saved === null || saved === undefined) return null
  if (saved.levelId !== level.id) return null

  return { ...benchFor(level), board: saved.board, pours: saved.pours }
}

function benchFor(level: Level): Bench {
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
    }
  }
}

function tap(bench: Bench, index: number): Bench {
  const sequence = bench.lastTap.sequence + 1
  const quietTap = {
    sequence,
    completedFlaskIndex: null,
    refusedFlaskIndex: null
  }

  if (bench.selectedIndex === null) {
    const picked = pickUp(bench.board, index)
    return {
      ...bench,
      selectedIndex: picked,
      lastTap: {
        ...quietTap,
        outcome: picked === null ? 'ignored' : 'picked-up'
      }
    }
  }

  if (bench.selectedIndex === index) {
    return {
      ...bench,
      selectedIndex: null,
      lastTap: { ...quietTap, outcome: 'put-down' }
    }
  }

  if (!canPourBetween(bench.board, bench.selectedIndex, index)) {
    return {
      ...bench,
      selectedIndex: null,
      lastTap: { ...quietTap, outcome: 'refused', refusedFlaskIndex: index }
    }
  }

  const board = pourBetween(bench.board, bench.selectedIndex, index)

  return {
    ...bench,
    board,
    selectedIndex: null,
    pours: bench.pours + 1,
    lastTap: {
      ...quietTap,
      outcome: 'poured',
      // Only the flask receiving the pour can have just been filled.
      completedFlaskIndex: isComplete(board[index]) ? index : null
    }
  }
}

function pickUp(board: Board, index: number): number | null {
  const flask = board[index]
  if (flask === undefined || isEmpty(flask) || isComplete(flask)) return null
  return index
}
