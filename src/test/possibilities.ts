import { canPourBetween, isSolved, pourBetween } from '../domain/board'
import type { Board } from '../domain/board'

export interface Possibilities {
  /** Every arrangement the board can be poured into, itself included. */
  readonly reachable: number
  /** How many of those can no longer be sorted, whatever is poured next. */
  readonly lost: number
}

/**
 * The size and the shape of the space a board opens up.
 *
 * Test support rather than game code, and the measure the campaign's difficulty
 * is built on: how hard a board is has nothing to do with how many pours it
 * takes to sort — the five-elixir board with one spare takes fewer pours than
 * the six-elixir board with two, and every player finds it harder. What they
 * are feeling is the room. A board with a spare flask can be poured back out
 * of almost anywhere; a board without one turns half of its own arrangements
 * into traps, and the player has to see them coming.
 *
 * Two boards holding the same flasks in a different order are the same
 * arrangement, so they are counted once.
 */
export function possibilitiesOf(board: Board): Possibilities {
  const arrangements = walk(board)
  return {
    reachable: arrangements.length,
    lost: arrangements.length - stillSortable(arrangements).size
  }
}

interface Arrangement {
  readonly board: Board
  /** Where a pour from here lands, as positions in the walk. */
  readonly pourInto: number[]
}

function walk(opening: Board): Arrangement[] {
  const seen = new Map<string, number>([[fingerprint(opening), 0]])
  const arrangements: Arrangement[] = [{ board: opening, pourInto: [] }]
  const unexplored = [0]

  while (unexplored.length > 0) {
    const at = unexplored.pop() as number
    const from = arrangements[at]

    for (const [source, target] of legalPours(from.board)) {
      const poured = pourBetween(from.board, source, target)
      const key = fingerprint(poured)

      let landsOn = seen.get(key)
      if (landsOn === undefined) {
        landsOn = arrangements.length
        seen.set(key, landsOn)
        arrangements.push({ board: poured, pourInto: [] })
        unexplored.push(landsOn)
      }
      from.pourInto.push(landsOn)
    }
  }

  return arrangements
}

/**
 * Every arrangement with a route back to a sorted board, found by walking the
 * pours backwards from the sorted ones rather than searching forwards from
 * each arrangement in turn.
 */
function stillSortable(arrangements: Arrangement[]): Set<number> {
  const pourFrom: number[][] = arrangements.map(() => [])
  arrangements.forEach((arrangement, at) => {
    for (const landsOn of arrangement.pourInto) pourFrom[landsOn].push(at)
  })

  const sortable = new Set<number>()
  const unexplored: number[] = []
  arrangements.forEach((arrangement, at) => {
    if (!isSolved(arrangement.board)) return
    sortable.add(at)
    unexplored.push(at)
  })

  while (unexplored.length > 0) {
    const at = unexplored.pop() as number
    for (const before of pourFrom[at]) {
      if (sortable.has(before)) continue
      sortable.add(before)
      unexplored.push(before)
    }
  }

  return sortable
}

function legalPours(board: Board): [number, number][] {
  const pours: [number, number][] = []

  for (let source = 0; source < board.length; source++) {
    for (let target = 0; target < board.length; target++) {
      if (canPourBetween(board, source, target)) pours.push([source, target])
    }
  }

  return pours
}

/*
 * The same fingerprint the shortest-solution search uses: flasks sorted, so
 * that two boards holding the same glass in a different order count once, and
 * the size of a glass part of what it is.
 */
function fingerprint(board: Board): string {
  return board
    .map((flask) => `${flask.capacity}:${flask.contents.join(',')}`)
    .sort()
    .join('|')
}
