import { describe, expect, it } from 'vitest'
import { shortestSolution } from './shortestSolution'
import { pourBetween } from '../domain/board'
import { emptyFlask, filledFlask, isComplete, isEmpty } from '../domain/flask'
import type { Board } from '../domain/board'

/** Two elixirs and one spare flask, which takes five pours to sort. */
const twoElixirs: Board = [
  filledFlask(['crimson', 'azure', 'azure', 'crimson']),
  filledFlask(['azure', 'crimson', 'crimson', 'azure']),
  emptyFlask(4)
]

describe('shortestSolution', () => {
  it('sorts a nearly finished board in the single pour it has left', () => {
    const board: Board = [
      { capacity: 4, contents: ['crimson', 'crimson', 'crimson'] },
      { capacity: 4, contents: ['crimson'] },
      filledFlask(['azure', 'azure', 'azure', 'azure'])
    ]

    expect(shortestSolution(board)).toHaveLength(1)
  })

  it('measures the shortest route, not the first one it stumbles on', () => {
    expect(shortestSolution(twoElixirs)).toHaveLength(5)
  })

  it('returns a route the board accepts, with nothing left mixed at the end', () => {
    const route = shortestSolution(twoElixirs) ?? []

    // pourBetween throws on a pour the flasks would refuse, so replaying the
    // route is itself the check that every step of it is legal.
    const finished = route.reduce<Board>(
      (board, [source, target]) => pourBetween(board, source, target),
      twoElixirs
    )

    expect(
      finished.filter((flask) => !isEmpty(flask) && !isComplete(flask))
    ).toEqual([])
  })

  it('has nothing to pour on a board that is already sorted', () => {
    const board: Board = [
      filledFlask(['crimson', 'crimson', 'crimson', 'crimson']),
      emptyFlask(4)
    ]

    expect(shortestSolution(board)).toEqual([])
  })

  it('reports a board that no sequence of pours can sort', () => {
    const board: Board = [
      filledFlask(['crimson', 'azure', 'crimson', 'azure']),
      filledFlask(['azure', 'crimson', 'azure', 'crimson'])
    ]

    expect(shortestSolution(board)).toBeNull()
  })

  it('seals a board of mixed glass by pouring into the vial that fits', () => {
    const board: Board = [
      { capacity: 3, contents: ['crimson', 'crimson'] },
      { capacity: 3, contents: ['crimson'] },
      filledFlask(['azure', 'azure', 'azure', 'azure', 'azure'])
    ]

    expect(shortestSolution(board)).toHaveLength(1)
  })

  it('reports a board whose elixirs no glass on it can fill to the brim', () => {
    // Three layers of crimson and two of verdant, where every glass holds
    // five: no sequence of pours can seal either of them.
    const board: Board = [
      filledFlask(['crimson', 'verdant', 'crimson', 'verdant', 'crimson']),
      emptyFlask(5)
    ]

    expect(shortestSolution(board)).toBeNull()
  })
})
