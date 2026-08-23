import { describe, expect, it } from 'vitest'
import { possibilitiesOf } from './possibilities'
import { emptyFlask, filledFlask, partFilledFlask } from '../domain/flask'
import type { Board } from '../domain/board'

/** One pour from sorted, and no way to spoil it. */
const oneMorePour: Board = [
  partFilledFlask(4, ['crimson', 'crimson', 'crimson']),
  partFilledFlask(4, ['crimson']),
  filledFlask(['azure', 'azure', 'azure', 'azure'])
]

describe('possibilitiesOf', () => {
  it('counts the board itself among the arrangements it can reach', () => {
    const board: Board = [filledFlask(['crimson', 'crimson'])]

    expect(possibilitiesOf(board)).toEqual({ reachable: 1, lost: 0 })
  })

  it('counts every arrangement a board can be poured into', () => {
    // Either flask can pour into the other, and both leave the same board
    // sorted: two arrangements in all, whichever way round it is done.
    expect(possibilitiesOf(oneMorePour)).toEqual({ reachable: 2, lost: 0 })
  })

  /*
   * The measure the campaign is built on. A board is hard because of how much
   * of it is a trap, not because of how many pours it takes: an arrangement
   * counts as lost when no sequence of pours from it can sort the board again.
   */
  it('counts the arrangements from which the board can no longer be sorted', () => {
    // Ten arrangements between them, and exactly one of them a dead end: the
    // spare vial filled with the wrong elixir, with nowhere left to pour it.
    const spoilable: Board = [
      filledFlask(['azure', 'verdant', 'azure']),
      filledFlask(['crimson', 'crimson', 'azure']),
      filledFlask(['verdant', 'verdant', 'crimson']),
      emptyFlask(3)
    ]

    expect(possibilitiesOf(spoilable)).toEqual({ reachable: 10, lost: 1 })
  })

  it('counts a board nobody could ever sort as lost from the outset', () => {
    const hopeless: Board = [
      filledFlask(['crimson', 'azure', 'crimson', 'azure']),
      filledFlask(['azure', 'crimson', 'azure', 'crimson'])
    ]

    expect(possibilitiesOf(hopeless)).toEqual({ reachable: 1, lost: 1 })
  })

  it('leaves a spare flask counted as the room it is', () => {
    const roomy: Board = [
      filledFlask(['crimson', 'azure']),
      filledFlask(['azure', 'crimson']),
      emptyFlask(2)
    ]

    expect(possibilitiesOf(roomy).lost).toBe(0)
  })
})
