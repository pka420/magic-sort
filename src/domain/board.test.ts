import { describe, expect, it } from 'vitest'
import {
  canPourBetween,
  completedFlaskCount,
  flasksToFill,
  isSolved,
  isStuck,
  pourBetween
} from './board'
import { emptyFlask } from './flask'
import type { Board } from './board'
import type { Elixir, Flask } from './flask'

/** A glass of a given size, holding whatever has been poured into it so far. */
function glass(capacity: number, ...contents: Elixir[]): Flask {
  return { capacity, contents }
}

describe('isSolved', () => {
  it('is true once every flask is empty or filled with a single elixir', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'crimson'),
      glass(4, 'azure', 'azure', 'azure', 'azure'),
      emptyFlask(4)
    ]

    expect(isSolved(board)).toBe(true)
  })

  it('is false while any flask still holds mixed elixirs', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'azure'),
      glass(4, 'azure', 'azure', 'azure', 'crimson'),
      emptyFlask(4)
    ]

    expect(isSolved(board)).toBe(false)
  })

  it('is false when an elixir is pure but not yet gathered into one flask', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson'),
      glass(4, 'crimson', 'crimson'),
      emptyFlask(4)
    ]

    expect(isSolved(board)).toBe(false)
  })

  it('is false while a taller flask is still a layer short of its brim', () => {
    const board: Board = [
      glass(5, 'crimson', 'crimson', 'crimson', 'crimson'),
      emptyFlask(5)
    ]

    expect(isSolved(board)).toBe(false)
  })

  it('holds a board of mixed glass to each flask its own brim', () => {
    const board: Board = [
      glass(5, 'crimson', 'crimson', 'crimson', 'crimson', 'crimson'),
      glass(3, 'azure', 'azure', 'azure'),
      emptyFlask(3)
    ]

    expect(isSolved(board)).toBe(true)
  })
})

describe('isStuck', () => {
  it('is true once every flask is full and no two tops match', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'azure'),
      glass(4, 'azure', 'azure', 'azure', 'crimson')
    ]

    expect(isStuck(board)).toBe(true)
  })

  it('is false while a spare flask is standing there to be poured into', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'azure'),
      glass(4, 'azure', 'azure', 'azure', 'crimson'),
      emptyFlask(4)
    ]

    expect(isStuck(board)).toBe(false)
  })

  it('is false while an elixir has its own kind to be poured onto', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'azure'),
      glass(4, 'crimson', 'crimson', 'azure'),
      glass(4, 'verdant', 'verdant', 'verdant', 'verdant')
    ]

    expect(isStuck(board)).toBe(false)
  })

  /* A board with nowhere to pour because it is finished is not a board to end
     a run over. */
  it('is false on a sorted board, which has run out of pours by winning', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'crimson'),
      glass(4, 'azure', 'azure', 'azure', 'azure')
    ]

    expect(isStuck(board)).toBe(false)
  })

  /* Mixed glass is where this bites: the room left on the board is in a vial
     the runs beside it are too tall to be poured into. */
  it('is true when the only room left turns away the tops that could fill it', () => {
    const board: Board = [
      glass(3, 'crimson', 'azure'),
      glass(5, 'verdant', 'verdant', 'verdant', 'verdant', 'crimson'),
      glass(5, 'azure', 'azure', 'azure', 'azure', 'verdant')
    ]

    expect(isStuck(board)).toBe(true)
  })
})

describe('completedFlaskCount', () => {
  it('counts the flasks filled to capacity with a single elixir', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'crimson'),
      glass(4, 'azure', 'azure'),
      glass(4, 'verdant', 'verdant', 'verdant', 'verdant'),
      emptyFlask(4)
    ]

    expect(completedFlaskCount(board)).toBe(2)
  })

  it('counts only what each flask calls filled', () => {
    const board: Board = [
      glass(5, 'crimson', 'crimson', 'crimson', 'crimson', 'crimson'),
      glass(5, 'azure', 'azure', 'azure', 'azure')
    ]

    expect(completedFlaskCount(board)).toBe(1)
  })
})

describe('flasksToFill', () => {
  it('counts one flask for every elixir the board holds', () => {
    const board: Board = [
      glass(4, 'crimson', 'azure', 'verdant'),
      glass(4, 'azure', 'crimson'),
      glass(4, 'verdant'),
      emptyFlask(4)
    ]

    expect(flasksToFill(board)).toBe(3)
  })

  it('ignores the empty flasks a sorted board leaves behind', () => {
    const board: Board = [
      glass(4, 'crimson', 'crimson', 'crimson', 'crimson'),
      emptyFlask(4),
      emptyFlask(4)
    ]

    expect(flasksToFill(board)).toBe(1)
  })
})

describe('canPourBetween', () => {
  const board: Board = [
    glass(4, 'crimson'),
    glass(4, 'crimson', 'azure'),
    emptyFlask(4)
  ]

  it('allows a pour the flasks themselves accept', () => {
    expect(canPourBetween(board, 0, 2)).toBe(true)
  })

  it('rejects a pour onto a mismatched top layer', () => {
    expect(canPourBetween(board, 0, 1)).toBe(false)
  })

  it('rejects pouring a flask into itself', () => {
    expect(canPourBetween(board, 0, 0)).toBe(false)
  })
})

describe('pourBetween', () => {
  it('moves the elixir and leaves every other flask untouched', () => {
    const board: Board = [
      glass(4, 'azure', 'crimson'),
      glass(4, 'crimson'),
      glass(4, 'verdant')
    ]

    expect(pourBetween(board, 0, 1)).toEqual([
      glass(4, 'azure'),
      glass(4, 'crimson', 'crimson'),
      glass(4, 'verdant')
    ])
  })

  it('returns a new board instead of mutating the one it was given', () => {
    const board: Board = [glass(4, 'crimson'), emptyFlask(4)]

    pourBetween(board, 0, 1)

    expect(board).toEqual([glass(4, 'crimson'), emptyFlask(4)])
  })

  it('pours into a flask that only its own taller glass has room in', () => {
    const board: Board = [
      glass(5, 'crimson'),
      glass(5, 'crimson', 'crimson', 'crimson', 'crimson')
    ]

    expect(pourBetween(board, 0, 1)).toEqual([
      emptyFlask(5),
      glass(5, 'crimson', 'crimson', 'crimson', 'crimson', 'crimson')
    ])
  })

  it('refuses to pour a flask into itself', () => {
    expect(() => pourBetween([glass(4, 'crimson')], 0, 0)).toThrow(
      'Cannot pour a flask into itself'
    )
  })

  it('refuses a pour onto a mismatched elixir', () => {
    expect(() =>
      pourBetween([glass(4, 'crimson'), glass(4, 'azure')], 0, 1)
    ).toThrow('Cannot pour crimson onto azure')
  })
})
