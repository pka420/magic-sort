import { describe, expect, it } from 'vitest'
import { endOfRun } from './runsEnd'
import { emptyFlask } from './flask'
import type { Board } from './board'
import type { Elixir, Flask } from './flask'

/** A glass of a given size, holding whatever has been poured into it so far. */
function glass(capacity: number, ...contents: Elixir[]): Flask {
  return { capacity, contents }
}

/** A board mid-sort, with a spare flask and every pour still open to it. */
const openBoard: Board = [glass(4, 'crimson', 'azure'), emptyFlask(4)]

/** A board with nothing left to pour: both flasks full, and their tops clash. */
const stuckBoard: Board = [
  glass(4, 'crimson', 'crimson', 'crimson', 'azure'),
  glass(4, 'azure', 'azure', 'azure', 'crimson')
]

describe('endOfRun', () => {
  it('leaves a run open while there are pours left on the board', () => {
    expect(endOfRun({ board: openBoard, banked: 0, position: 1 })).toBeNull()
  })

  it('ends the run of a player stuck on a level they cannot pay to lay out again', () => {
    expect(endOfRun({ board: stuckBoard, banked: 0, position: 1 })).toEqual({
      kind: 'stuck',
      price: 100
    })
  })

  /* Being stuck is only the end of a run when the way out of it is priced out
     of reach: a player who can pay for a restart is merely stuck. */
  it('leaves a stuck player who can pay for a restart to go and take it', () => {
    expect(endOfRun({ board: stuckBoard, banked: 100, position: 1 })).toBeNull()
  })

  it('leaves a player with pours left alone, however little they have banked', () => {
    expect(endOfRun({ board: openBoard, banked: 0, position: 5 })).toBeNull()
  })

  it('prices the restart by the level the player is stuck on', () => {
    expect(endOfRun({ board: stuckBoard, banked: 400, position: 5 })).toEqual({
      kind: 'stuck',
      price: 500
    })
  })
})
