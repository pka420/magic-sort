import type { Board } from '../domain/board'
import type { Elixir } from '../domain/flask'

/**
 * A board laid out in glass all of one size, which is how the campaign's
 * earlier levels are built and how a fixture wants to read. Flasks carry their
 * own capacity, so a fixture that names it once per level says the same thing
 * with far less noise than a board of objects.
 */
export function boardOfGlass(
  capacity: number,
  ...flasks: readonly (readonly Elixir[])[]
): Board {
  return flasks.map((contents) => ({ capacity, contents }))
}
