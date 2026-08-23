import { canPourBetween, isSolved, pourBetween } from '../domain/board'
import type { Board } from '../domain/board'

/** A pour, as the two flask positions it moves elixir between. */
export type Pour = readonly [source: number, target: number]

interface Visit {
  readonly key: string
  readonly board: Board
  readonly cameFrom: string | null
  readonly pour: Pour | null
}

/**
 * The shortest way to sort a board, or null if no sequence of pours can.
 *
 * Test support rather than game code: it is what lets a level's pour count be
 * proven the true minimum instead of merely the best route anyone happened to
 * find, which is the promise the scoreboard makes to the player.
 *
 * Breadth-first, so the first sorted board it reaches is the closest one. Two
 * boards holding the same flasks in a different order are the same puzzle, so
 * they are explored once — without that, the search is too slow to run over
 * every level on every test run.
 */
export function shortestSolution(board: Board): readonly Pour[] | null {
  const opening: Visit = {
    key: boardFingerprint(board),
    board,
    cameFrom: null,
    pour: null
  }
  const visited = new Map<string, Visit>([[opening.key, opening]])
  let frontier: Visit[] = [opening]

  while (frontier.length > 0) {
    const sorted = frontier.find((visit) => isSolved(visit.board))
    if (sorted !== undefined) return routeTo(sorted, visited)

    const next: Visit[] = []
    for (const visit of frontier) {
      for (const pour of legalPours(visit.board)) {
        const poured = pourBetween(visit.board, pour[0], pour[1])
        const key = boardFingerprint(poured)
        if (visited.has(key)) continue

        const step: Visit = {
          key,
          board: poured,
          cameFrom: visit.key,
          pour
        }
        visited.set(key, step)
        next.push(step)
      }
    }

    frontier = next
  }

  return null
}

function legalPours(board: Board): Pour[] {
  const pours: Pour[] = []

  for (let source = 0; source < board.length; source++) {
    for (let target = 0; target < board.length; target++) {
      if (canPourBetween(board, source, target)) {
        pours.push([source, target])
      }
    }
  }

  return pours
}

function routeTo(end: Visit, visited: Map<string, Visit>): readonly Pour[] {
  const route: Pour[] = []
  let step: Visit | undefined = end

  while (step !== undefined && step.pour !== null) {
    route.unshift(step.pour)
    step = step.cameFrom === null ? undefined : visited.get(step.cameFrom)
  }

  return route
}

/*
 * Two boards holding the same flasks in a different order are the same puzzle,
 * so the fingerprint sorts them. The size of the glass is part of what a flask
 * is: an empty three-layer vial and an empty five is not the same spare.
 */
function boardFingerprint(board: Board): string {
  return board
    .map((flask) => `${flask.capacity}:${flask.contents.join(',')}`)
    .sort()
    .join('|')
}
