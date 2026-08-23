import { isStuck } from './board'
import { canPayForRestart, priceOfRestart } from './scoring'
import type { Board } from './board'

/**
 * How a run ended, which is what the card that closes it has to say. Both
 * endings are the same sentence from a different side: the apprentice cannot
 * pay their way to a bench worth sorting.
 */
export type RunsEnd =
  /** On a bench with no pour left, and priced out of laying it out again. */
  | { readonly kind: 'stuck'; readonly price: number }
  /** Threw a bench away without the points to pay for it. */
  | { readonly kind: 'restart'; readonly price: number }

export interface Run {
  /** The bench in front of the apprentice, which may have run dry of pours. */
  readonly board: Board
  /** Points from the benches left behind, less what restarts have cost. */
  readonly banked: number
  /** Which bench of the atelier this is, counted the way a player counts. */
  readonly position: number
}

/**
 * Whether the bench in front of the apprentice has ended their run on its own,
 * and what to say about it, or null while there is a way out left. It is the
 * one ending nobody presses for: the campaign knows what is banked and the
 * bench knows what can still be poured, and neither answers it alone.
 */
export function endOfRun({ board, banked, position }: Run): RunsEnd | null {
  if (isStuck(board) && !canPayForRestart({ banked, position })) {
    return { kind: 'stuck', price: priceOfRestart(position) }
  }

  return null
}
