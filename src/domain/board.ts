import { canPour, isComplete, isEmpty, pour } from './flask'
import type { Flask } from './flask'

/** Every flask on the board, in the order the player sees them. */
export type Board = readonly Flask[]

export function isSolved(board: Board): boolean {
  return board.every((flask) => isEmpty(flask) || isComplete(flask))
}

/**
 * A board with no pour left in it: every flask with room to spare turns away
 * the top of every flask that could fill it. A sorted board has run out of
 * pours too, but by winning, so it never counts as stuck.
 */
export function isStuck(board: Board): boolean {
  if (isSolved(board)) return false

  return !board.some((_, source) =>
    board.some((_, target) => canPourBetween(board, source, target))
  )
}

export function completedFlaskCount(board: Board): number {
  return board.filter(isComplete).length
}

/** How many flasks a sorted board ends up with: one per elixir on it. */
export function flasksToFill(board: Board): number {
  return new Set(board.flatMap((flask) => flask.contents)).size
}

export function canPourBetween(
  board: Board,
  sourceIndex: number,
  targetIndex: number
): boolean {
  if (sourceIndex === targetIndex) return false
  return canPour(flaskAt(board, sourceIndex), flaskAt(board, targetIndex))
}

export function pourBetween(
  board: Board,
  sourceIndex: number,
  targetIndex: number
): Board {
  if (sourceIndex === targetIndex) {
    throw new Error('Cannot pour a flask into itself')
  }

  const result = pour(flaskAt(board, sourceIndex), flaskAt(board, targetIndex))

  return board.map((flask, index) => {
    if (index === sourceIndex) return result.source
    if (index === targetIndex) return result.target
    return flask
  })
}

function flaskAt(board: Board, index: number): Flask {
  const flask = board[index]
  if (flask === undefined) {
    throw new Error(
      `No flask at position ${index} on a board of ${board.length}`
    )
  }
  return flask
}
