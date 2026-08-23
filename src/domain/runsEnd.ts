import { isStuck } from './board'
import { canPayForRestart, priceOfRestart } from './scoring'
import type { Board } from './board'

/**
 * How a run ended, which is what the card that closes it has to say. Both
 * endings are the same sentence from a different side: the player cannot
 * pay their way to a level worth sorting.
 */
export type RunsEnd =
  /** On a level with no pour left, and priced out of laying it out again. */
  | { readonly kind: 'stuck'; readonly price: number }
  /** Threw a level away without the points to pay for it. */
  | { readonly kind: 'restart'; readonly price: number }

export interface Run {
  /** The board in front of the player, which may have run dry of pours. */
  readonly board: Board
  /** Points from the levels left behind, less what restarts have cost. */
  readonly banked: number
  /** Which level of the campaign this is, counted the way a player counts. */
  readonly position: number
}

/**
 * Whether the board in front of the player has ended their run on its own,
 * and what to say about it, or null while there is a way out left. It is the
 * one ending nobody presses for: the campaign knows what is banked and the
 * board knows what can still be poured, and neither answers it alone.
 */
export function endOfRun({ board, banked, position }: Run): RunsEnd | null {
  if (isStuck(board) && !canPayForRestart({ banked, position })) {
    return { kind: 'stuck', price: priceOfRestart(position) }
  }

  return null
}
