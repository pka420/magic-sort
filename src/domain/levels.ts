import { emptyFlask, filledFlask, partFilledFlask } from './flask'
import type { Board } from './board'

/**
 * A stable handle for a level, so a half-sorted board can be recognised again
 * after a reload. It deliberately carries no position: the play order is the
 * order of this list, which has already changed once.
 */
export interface Level {
  readonly id: number
  /**
   * The fewest pours that can sort this level, which the scoreboard promises
   * the player is the true minimum, and the solve bonus measures them against.
   * A breadth-first search over every reachable board proves each one in the
   * test suite, so editing a board without re-running it will fail the build.
   */
  readonly minimumPours: number
  readonly board: Board
}

const LAYOUTS: readonly Omit<Level, 'id'>[] = [
  {
    minimumPours: 14,
    board: [
      filledFlask(['crimson', 'azure', 'verdant', 'amber']),
      filledFlask(['azure', 'crimson', 'amber', 'verdant']),
      filledFlask(['verdant', 'amber', 'crimson', 'azure']),
      filledFlask(['amber', 'verdant', 'azure', 'crimson']),
      emptyFlask(4),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 16,
    board: [
      filledFlask(['amber', 'crimson', 'verdant', 'azure']),
      filledFlask(['violet', 'azure', 'violet', 'amber']),
      filledFlask(['crimson', 'violet', 'crimson', 'verdant']),
      filledFlask(['amber', 'verdant', 'crimson', 'verdant']),
      filledFlask(['amber', 'violet', 'azure', 'azure']),
      emptyFlask(4),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 21,
    board: [
      filledFlask(['crimson', 'verdant', 'violet', 'amber']),
      filledFlask(['pearl', 'amber', 'azure', 'violet']),
      filledFlask(['amber', 'crimson', 'verdant', 'pearl']),
      filledFlask(['azure', 'amber', 'crimson', 'azure']),
      filledFlask(['violet', 'verdant', 'azure', 'violet']),
      filledFlask(['pearl', 'verdant', 'crimson', 'pearl']),
      emptyFlask(4),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 18,
    board: [
      filledFlask(['violet', 'amber', 'verdant', 'crimson']),
      filledFlask(['verdant', 'crimson', 'amber', 'azure']),
      filledFlask(['amber', 'violet', 'azure', 'violet']),
      filledFlask(['verdant', 'azure', 'violet', 'crimson']),
      filledFlask(['verdant', 'crimson', 'azure', 'amber']),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 22,
    board: [
      filledFlask(['azure', 'crimson', 'pearl', 'crimson']),
      filledFlask(['amber', 'violet', 'pearl', 'violet']),
      filledFlask(['amber', 'verdant', 'pearl', 'verdant']),
      filledFlask(['amber', 'azure', 'amber', 'violet']),
      filledFlask(['verdant', 'violet', 'pearl', 'crimson']),
      filledFlask(['crimson', 'azure', 'verdant', 'azure']),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 18,
    board: [
      filledFlask(['amber', 'crimson', 'amber', 'azure', 'crimson']),
      filledFlask(['amber', 'verdant', 'amber', 'crimson', 'verdant']),
      filledFlask(['verdant', 'azure', 'verdant', 'azure', 'crimson']),
      filledFlask(['amber', 'crimson', 'azure', 'verdant', 'azure']),
      emptyFlask(5),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 21,
    board: [
      filledFlask(['verdant', 'crimson', 'verdant', 'crimson', 'amber']),
      filledFlask(['amber', 'crimson', 'violet', 'violet', 'azure']),
      filledFlask(['amber', 'crimson', 'verdant', 'crimson', 'verdant']),
      filledFlask(['violet', 'violet', 'amber', 'verdant', 'azure']),
      filledFlask(['azure', 'amber', 'azure', 'violet', 'azure']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 26,
    board: [
      filledFlask(['violet', 'azure', 'pearl', 'amber', 'verdant']),
      filledFlask(['verdant', 'pearl', 'azure', 'crimson', 'violet']),
      filledFlask(['pearl', 'amber', 'crimson', 'azure', 'pearl']),
      filledFlask(['violet', 'pearl', 'violet', 'verdant', 'crimson']),
      filledFlask(['crimson', 'amber', 'azure', 'amber', 'verdant']),
      filledFlask(['amber', 'crimson', 'violet', 'azure', 'verdant']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 15,
    board: [
      filledFlask(['verdant', 'azure', 'amber', 'verdant', 'crimson']),
      filledFlask(['amber', 'azure', 'verdant', 'crimson', 'amber']),
      filledFlask(['crimson', 'azure', 'azure']),
      filledFlask(['crimson', 'azure', 'crimson']),
      emptyFlask(5),
      emptyFlask(3)
    ]
  },
  {
    minimumPours: 18,
    board: [
      filledFlask(['violet', 'crimson', 'azure', 'crimson', 'amber']),
      filledFlask(['violet', 'amber', 'azure', 'crimson', 'verdant']),
      filledFlask(['azure', 'crimson', 'verdant', 'verdant', 'amber']),
      filledFlask(['verdant', 'verdant', 'crimson']),
      filledFlask(['azure', 'violet', 'azure']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 24,
    board: [
      filledFlask(['amber', 'verdant', 'crimson', 'amber', 'verdant']),
      filledFlask(['verdant', 'crimson', 'azure', 'pearl', 'verdant']),
      filledFlask(['azure', 'violet', 'amber', 'violet', 'violet']),
      filledFlask(['azure', 'crimson', 'pearl']),
      filledFlask(['pearl', 'verdant', 'crimson']),
      filledFlask(['azure', 'crimson', 'azure']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 16,
    board: [
      filledFlask(['verdant', 'azure', 'amber', 'verdant', 'crimson']),
      filledFlask(['amber', 'azure', 'verdant', 'crimson']),
      filledFlask(['amber', 'crimson', 'azure', 'verdant']),
      filledFlask(['crimson', 'azure', 'crimson']),
      emptyFlask(5),
      emptyFlask(3)
    ]
  },
  {
    minimumPours: 22,
    board: [
      filledFlask(['amber', 'azure', 'violet', 'crimson', 'amber']),
      filledFlask(['verdant', 'crimson', 'azure', 'verdant', 'violet']),
      filledFlask(['violet', 'amber', 'azure', 'verdant']),
      filledFlask(['azure', 'crimson', 'amber', 'crimson']),
      filledFlask(['verdant', 'crimson', 'azure']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 24,
    board: [
      filledFlask(['violet', 'verdant', 'violet', 'amber', 'verdant']),
      filledFlask(['pearl', 'amber', 'azure', 'amber', 'crimson']),
      filledFlask(['azure', 'crimson', 'amber', 'crimson']),
      filledFlask(['verdant', 'pearl', 'azure', 'verdant']),
      filledFlask(['crimson', 'azure', 'crimson']),
      filledFlask(['violet', 'pearl', 'azure']),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 17,
    board: [
      filledFlask(['crimson', 'azure', 'crimson', 'azure']),
      filledFlask(['verdant', 'azure', 'verdant', 'crimson', 'azure', 'amber']),
      filledFlask(['amber', 'crimson', 'crimson', 'azure', 'azure', 'amber']),
      filledFlask(['verdant', 'amber', 'verdant', 'crimson']),
      emptyFlask(6),
      emptyFlask(4)
    ]
  },
  {
    minimumPours: 24,
    board: [
      filledFlask(['azure', 'violet', 'verdant', 'azure']),
      filledFlask(['amber', 'crimson', 'verdant', 'crimson']),
      filledFlask(['crimson', 'azure', 'crimson', 'violet']),
      filledFlask(['azure', 'amber', 'verdant', 'amber', 'crimson', 'azure']),
      filledFlask(['violet', 'verdant', 'amber', 'crimson', 'violet', 'azure']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 24,
    board: [
      filledFlask(['azure', 'crimson', 'verdant', 'verdant', 'azure', 'pearl']),
      filledFlask(['azure', 'crimson', 'crimson', 'violet']),
      filledFlask(['amber', 'pearl', 'azure', 'crimson']),
      filledFlask(['pearl', 'crimson', 'azure', 'crimson', 'verdant', 'azure']),
      filledFlask(['violet', 'amber', 'amber', 'violet', 'verdant', 'verdant']),
      filledFlask(['amber', 'pearl', 'verdant', 'violet']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 26,
    board: [
      filledFlask([
        'crimson',
        'pearl',
        'verdant',
        'crimson',
        'violet',
        'verdant'
      ]),
      filledFlask(['azure', 'amber', 'amber', 'pearl', 'verdant', 'azure']),
      filledFlask(['azure', 'crimson', 'pearl', 'azure']),
      filledFlask(['violet', 'verdant', 'crimson', 'violet']),
      filledFlask(['verdant', 'violet', 'azure', 'pearl']),
      filledFlask(['crimson', 'crimson', 'amber', 'amber', 'verdant', 'azure']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 29,
    board: [
      filledFlask(['crimson', 'amber', 'verdant', 'amber', 'pearl', 'verdant']),
      filledFlask(['amber', 'saffron', 'pearl', 'crimson']),
      filledFlask(['verdant', 'violet', 'azure', 'crimson']),
      filledFlask(['crimson', 'crimson', 'crimson', 'azure']),
      filledFlask(['violet', 'azure', 'saffron', 'azure']),
      filledFlask([
        'verdant',
        'saffron',
        'amber',
        'verdant',
        'verdant',
        'saffron'
      ]),
      filledFlask(['azure', 'violet', 'pearl', 'azure', 'pearl', 'violet']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 14,
    board: [
      filledFlask(['azure', 'azure', 'azure', 'verdant', 'amber', 'amber']),
      filledFlask(['crimson', 'verdant', 'crimson']),
      filledFlask(['crimson', 'azure', 'amber', 'crimson']),
      filledFlask(['verdant', 'azure', 'crimson', 'crimson', 'verdant']),
      emptyFlask(6),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 28,
    board: [
      filledFlask(['azure', 'crimson', 'azure', 'verdant', 'azure', 'pearl']),
      filledFlask(['verdant', 'amber', 'crimson', 'amber', 'azure']),
      filledFlask(['pearl', 'azure', 'amber', 'amber']),
      filledFlask(['azure', 'violet', 'violet']),
      filledFlask([
        'violet',
        'crimson',
        'verdant',
        'pearl',
        'verdant',
        'verdant'
      ]),
      filledFlask(['crimson', 'crimson', 'violet', 'crimson', 'amber']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 30,
    board: [
      filledFlask([
        'verdant',
        'crimson',
        'saffron',
        'crimson',
        'saffron',
        'amber'
      ]),
      filledFlask(['azure', 'violet', 'violet', 'saffron']),
      filledFlask(['crimson', 'pearl', 'violet']),
      filledFlask(['azure', 'amber', 'azure', 'amber', 'crimson']),
      filledFlask(['verdant', 'crimson', 'azure', 'crimson']),
      filledFlask(['azure', 'pearl', 'pearl', 'verdant', 'amber', 'azure']),
      filledFlask(['amber', 'violet', 'pearl', 'verdant', 'verdant']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 35,
    board: [
      filledFlask(['amber', 'pearl', 'azure']),
      filledFlask(['saffron', 'amber', 'azure', 'verdant', 'crimson']),
      filledFlask(['verdant', 'verdant', 'amber', 'violet']),
      filledFlask(['crimson', 'crimson', 'pearl', 'violet']),
      filledFlask([
        'crimson',
        'azure',
        'crimson',
        'amber',
        'violet',
        'verdant'
      ]),
      filledFlask(['pearl', 'crimson', 'saffron', 'azure', 'saffron']),
      filledFlask(['amber', 'azure', 'verdant', 'pearl', 'azure', 'violet']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 34,
    board: [
      filledFlask(['amber', 'pearl', 'indigo', 'violet']),
      filledFlask(['amber', 'amber', 'crimson']),
      filledFlask(['indigo', 'azure', 'pearl', 'crimson', 'violet', 'crimson']),
      filledFlask(['pearl', 'verdant', 'verdant', 'verdant', 'azure']),
      filledFlask(['crimson', 'verdant', 'azure', 'violet']),
      filledFlask(['crimson', 'azure', 'violet', 'azure', 'indigo']),
      filledFlask(['amber', 'saffron', 'saffron', 'pearl', 'amber', 'crimson']),
      filledFlask(['verdant', 'azure', 'saffron']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 15,
    board: [
      partFilledFlask(4, ['crimson', 'amber', 'crimson']),
      partFilledFlask(6, ['amber', 'crimson', 'crimson', 'azure', 'azure']),
      partFilledFlask(4, ['azure', 'verdant', 'verdant']),
      partFilledFlask(6, ['azure', 'crimson', 'verdant', 'verdant', 'azure']),
      filledFlask(['crimson', 'amber', 'azure', 'amber']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 23,
    board: [
      filledFlask(['crimson', 'violet', 'azure', 'violet', 'crimson', 'amber']),
      filledFlask(['violet', 'azure', 'amber', 'verdant']),
      filledFlask(['pearl', 'pearl', 'crimson', 'amber']),
      partFilledFlask(6, ['pearl', 'crimson', 'violet', 'crimson', 'azure']),
      partFilledFlask(6, ['azure', 'crimson', 'azure', 'pearl', 'verdant']),
      partFilledFlask(4, ['azure', 'verdant']),
      partFilledFlask(4, ['amber', 'verdant'])
    ]
  },
  {
    minimumPours: 27,
    board: [
      partFilledFlask(4, ['verdant', 'crimson', 'crimson']),
      partFilledFlask(6, ['crimson', 'violet', 'amber', 'azure', 'verdant']),
      partFilledFlask(6, ['verdant', 'saffron', 'pearl', 'pearl', 'verdant']),
      partFilledFlask(4, ['verdant', 'pearl', 'amber']),
      filledFlask(['azure', 'azure', 'violet', 'azure', 'verdant', 'pearl']),
      partFilledFlask(4, ['crimson', 'azure', 'saffron']),
      partFilledFlask(6, ['crimson', 'violet', 'crimson', 'violet', 'amber']),
      filledFlask(['saffron', 'amber', 'azure', 'saffron'])
    ]
  },
  {
    minimumPours: 29,
    board: [
      filledFlask(['saffron', 'crimson', 'amber', 'azure']),
      filledFlask(['verdant', 'pearl', 'azure', 'crimson']),
      partFilledFlask(6, ['pearl', 'verdant', 'pearl', 'violet', 'verdant']),
      partFilledFlask(6, ['azure', 'azure', 'crimson', 'saffron', 'violet']),
      partFilledFlask(6, ['verdant', 'pearl', 'verdant', 'saffron', 'azure']),
      partFilledFlask(6, ['crimson', 'verdant', 'amber', 'crimson']),
      filledFlask(['violet', 'amber', 'saffron', 'violet']),
      partFilledFlask(4, ['azure', 'crimson', 'amber'])
    ]
  },
  {
    minimumPours: 36,
    board: [
      filledFlask(['amber', 'azure', 'saffron', 'pearl', 'azure', 'crimson']),
      partFilledFlask(4, ['crimson', 'verdant']),
      filledFlask(['amber', 'azure', 'amber', 'verdant']),
      filledFlask(['crimson', 'indigo', 'azure', 'indigo', 'violet', 'pearl']),
      filledFlask(['verdant', 'azure', 'amber', 'verdant']),
      partFilledFlask(6, ['verdant', 'amber', 'pearl', 'violet', 'violet']),
      partFilledFlask(6, ['saffron', 'indigo', 'violet', 'saffron', 'crimson']),
      partFilledFlask(6, ['verdant', 'crimson', 'amber', 'azure', 'crimson']),
      partFilledFlask(4, ['indigo', 'pearl', 'saffron'])
    ]
  },
  {
    minimumPours: 14,
    board: [
      filledFlask(['amber', 'crimson', 'verdant']),
      partFilledFlask(5, ['azure', 'verdant']),
      partFilledFlask(5, ['azure', 'azure', 'verdant', 'crimson']),
      partFilledFlask(6, ['amber', 'azure', 'crimson', 'crimson', 'azure']),
      filledFlask(['crimson', 'verdant', 'crimson', 'amber']),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 33,
    board: [
      filledFlask([
        'violet',
        'saffron',
        'crimson',
        'crimson',
        'verdant',
        'pearl'
      ]),
      filledFlask(['azure', 'crimson', 'saffron', 'pearl']),
      partFilledFlask(6, ['azure', 'crimson', 'verdant', 'amber', 'crimson']),
      filledFlask(['azure', 'crimson', 'amber', 'violet']),
      partFilledFlask(5, ['pearl', 'verdant', 'amber']),
      partFilledFlask(6, ['verdant', 'amber', 'azure', 'verdant', 'saffron']),
      filledFlask(['violet', 'amber', 'azure']),
      partFilledFlask(5, ['pearl', 'violet', 'azure'])
    ]
  },
  {
    minimumPours: 33,
    board: [
      partFilledFlask(4, ['verdant', 'violet', 'azure']),
      filledFlask([
        'azure',
        'verdant',
        'crimson',
        'verdant',
        'saffron',
        'crimson'
      ]),
      partFilledFlask(6, ['saffron', 'pearl', 'azure', 'pearl']),
      filledFlask(['crimson', 'crimson', 'amber', 'violet', 'verdant']),
      filledFlask(['azure', 'pearl', 'azure', 'violet', 'amber', 'azure']),
      partFilledFlask(4, ['verdant', 'crimson']),
      partFilledFlask(3, ['saffron', 'amber']),
      filledFlask(['amber', 'violet', 'crimson', 'amber', 'pearl'])
    ]
  },
  {
    minimumPours: 34,
    board: [
      partFilledFlask(6, ['verdant', 'violet', 'azure', 'amber']),
      partFilledFlask(6, ['crimson', 'pearl', 'azure', 'crimson', 'saffron']),
      partFilledFlask(3, ['indigo', 'verdant']),
      partFilledFlask(6, ['violet', 'pearl', 'saffron', 'verdant', 'pearl']),
      filledFlask(['pearl', 'azure', 'crimson', 'amber']),
      filledFlask(['verdant', 'amber', 'verdant']),
      partFilledFlask(4, ['indigo', 'indigo', 'crimson']),
      filledFlask(['amber', 'amber', 'crimson', 'azure', 'azure']),
      filledFlask(['crimson', 'saffron', 'violet', 'azure', 'violet'])
    ]
  },
  {
    minimumPours: 33,
    board: [
      filledFlask(['indigo', 'azure', 'azure', 'pearl', 'violet', 'saffron']),
      partFilledFlask(3, ['crimson', 'verdant']),
      partFilledFlask(5, ['amber', 'crimson', 'azure', 'indigo']),
      partFilledFlask(6, ['azure', 'verdant', 'crimson', 'saffron', 'saffron']),
      partFilledFlask(5, ['pearl', 'azure', 'azure', 'amber']),
      partFilledFlask(6, ['violet', 'amber', 'crimson', 'crimson', 'verdant']),
      filledFlask(['violet', 'crimson', 'pearl']),
      partFilledFlask(4, ['verdant', 'amber', 'amber']),
      filledFlask(['verdant', 'pearl', 'violet', 'indigo'])
    ]
  },
  {
    minimumPours: 16,
    board: [
      filledFlask([
        'amber',
        'azure',
        'verdant',
        'crimson',
        'crimson',
        'verdant',
        'crimson'
      ]),
      filledFlask([
        'crimson',
        'crimson',
        'amber',
        'azure',
        'azure',
        'azure',
        'crimson'
      ]),
      filledFlask(['azure', 'azure', 'verdant']),
      filledFlask(['crimson', 'azure', 'verdant', 'amber', 'verdant']),
      emptyFlask(7),
      emptyFlask(5)
    ]
  },
  {
    minimumPours: 25,
    board: [
      filledFlask(['azure', 'crimson', 'amber']),
      filledFlask([
        'violet',
        'pearl',
        'pearl',
        'pearl',
        'crimson',
        'azure',
        'azure'
      ]),
      filledFlask(['verdant', 'amber', 'verdant', 'amber', 'amber']),
      filledFlask([
        'violet',
        'crimson',
        'azure',
        'amber',
        'crimson',
        'verdant',
        'crimson'
      ]),
      filledFlask(['crimson', 'violet', 'verdant']),
      filledFlask(['azure', 'azure', 'verdant', 'azure', 'crimson']),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 34,
    board: [
      filledFlask(['crimson', 'violet', 'verdant']),
      filledFlask([
        'amber',
        'azure',
        'amber',
        'saffron',
        'saffron',
        'azure',
        'saffron'
      ]),
      filledFlask(['pearl', 'crimson', 'violet', 'verdant', 'verdant']),
      filledFlask(['azure', 'amber', 'verdant']),
      filledFlask([
        'azure',
        'violet',
        'violet',
        'amber',
        'pearl',
        'verdant',
        'azure'
      ]),
      filledFlask([
        'crimson',
        'violet',
        'pearl',
        'crimson',
        'crimson',
        'azure',
        'crimson'
      ]),
      filledFlask(['verdant', 'azure', 'amber', 'crimson', 'verdant']),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 31,
    board: [
      filledFlask(['crimson', 'saffron', 'verdant']),
      filledFlask([
        'violet',
        'pearl',
        'azure',
        'crimson',
        'verdant',
        'violet',
        'violet'
      ]),
      filledFlask(['amber', 'verdant', 'crimson']),
      filledFlask([
        'crimson',
        'crimson',
        'violet',
        'amber',
        'saffron',
        'verdant',
        'crimson'
      ]),
      filledFlask(['azure', 'amber', 'azure', 'verdant', 'verdant']),
      filledFlask(['pearl', 'amber', 'amber', 'pearl', 'crimson']),
      filledFlask([
        'azure',
        'saffron',
        'azure',
        'violet',
        'azure',
        'azure',
        'verdant'
      ]),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 37,
    board: [
      filledFlask(['verdant', 'crimson', 'verdant', 'azure', 'violet']),
      filledFlask([
        'amber',
        'amber',
        'crimson',
        'violet',
        'azure',
        'saffron',
        'verdant'
      ]),
      filledFlask(['azure', 'amber', 'indigo']),
      filledFlask([
        'crimson',
        'azure',
        'amber',
        'crimson',
        'verdant',
        'pearl',
        'indigo'
      ]),
      filledFlask(['violet', 'violet', 'amber', 'indigo', 'azure']),
      filledFlask([
        'azure',
        'pearl',
        'pearl',
        'pearl',
        'saffron',
        'verdant',
        'crimson'
      ]),
      filledFlask(['crimson', 'azure', 'violet', 'crimson', 'verdant']),
      filledFlask(['verdant', 'saffron', 'pearl']),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 14,
    board: [
      filledFlask(['crimson', 'crimson', 'amber', 'amber']),
      filledFlask(['azure', 'azure', 'amber', 'verdant', 'verdant', 'verdant']),
      filledFlask([
        'azure',
        'verdant',
        'azure',
        'crimson',
        'crimson',
        'azure',
        'amber'
      ]),
      filledFlask(['verdant', 'crimson', 'crimson', 'azure', 'crimson']),
      emptyFlask(7),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 39,
    board: [
      filledFlask([
        'crimson',
        'pearl',
        'violet',
        'azure',
        'pearl',
        'verdant',
        'verdant'
      ]),
      filledFlask(['crimson', 'verdant', 'amber', 'verdant']),
      filledFlask(['saffron', 'pearl', 'violet', 'violet', 'azure']),
      filledFlask(['amber', 'azure', 'saffron', 'azure', 'azure', 'verdant']),
      filledFlask([
        'crimson',
        'crimson',
        'azure',
        'crimson',
        'amber',
        'pearl',
        'amber'
      ]),
      filledFlask(['saffron', 'amber', 'violet', 'crimson', 'saffron']),
      filledFlask(['azure', 'amber', 'crimson', 'pearl', 'verdant', 'violet']),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 38,
    board: [
      filledFlask([
        'pearl',
        'verdant',
        'pearl',
        'verdant',
        'saffron',
        'saffron',
        'azure'
      ]),
      filledFlask(['amber', 'azure', 'amber', 'azure', 'verdant']),
      filledFlask([
        'crimson',
        'pearl',
        'crimson',
        'verdant',
        'pearl',
        'crimson'
      ]),
      filledFlask([
        'violet',
        'amber',
        'crimson',
        'verdant',
        'verdant',
        'violet',
        'violet'
      ]),
      filledFlask(['azure', 'azure', 'crimson', 'saffron']),
      filledFlask(['pearl', 'crimson', 'amber', 'violet', 'amber', 'azure']),
      filledFlask(['saffron', 'violet', 'amber', 'azure', 'crimson']),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 44,
    board: [
      filledFlask(['azure', 'verdant', 'crimson', 'azure']),
      filledFlask(['amber', 'verdant', 'pearl', 'azure', 'verdant']),
      filledFlask(['amber', 'amber', 'verdant', 'amber', 'azure', 'crimson']),
      filledFlask(['pearl', 'pearl', 'azure', 'crimson', 'indigo']),
      filledFlask(['verdant', 'indigo', 'azure', 'verdant']),
      filledFlask([
        'pearl',
        'indigo',
        'violet',
        'saffron',
        'violet',
        'crimson',
        'pearl'
      ]),
      filledFlask([
        'amber',
        'crimson',
        'indigo',
        'violet',
        'violet',
        'crimson',
        'azure'
      ]),
      filledFlask([
        'saffron',
        'amber',
        'crimson',
        'violet',
        'saffron',
        'saffron'
      ]),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 40,
    board: [
      filledFlask(['amber', 'azure', 'crimson', 'crimson', 'saffron']),
      filledFlask(['indigo', 'violet', 'verdant', 'indigo', 'amber']),
      filledFlask(['azure', 'violet', 'violet', 'azure', 'amber', 'crimson']),
      filledFlask(['pearl', 'crimson', 'amber', 'verdant']),
      filledFlask([
        'pearl',
        'crimson',
        'pearl',
        'pearl',
        'azure',
        'pearl',
        'crimson'
      ]),
      filledFlask([
        'saffron',
        'amber',
        'violet',
        'amber',
        'saffron',
        'azure',
        'saffron'
      ]),
      filledFlask(['azure', 'verdant', 'verdant', 'crimson']),
      filledFlask([
        'verdant',
        'verdant',
        'azure',
        'indigo',
        'indigo',
        'violet'
      ]),
      emptyFlask(7)
    ]
  },
  {
    minimumPours: 17,
    board: [
      partFilledFlask(5, ['azure', 'crimson', 'crimson', 'verdant']),
      partFilledFlask(4, ['azure', 'crimson', 'crimson']),
      partFilledFlask(3, ['azure', 'crimson']),
      partFilledFlask(6, ['verdant', 'azure', 'azure', 'crimson', 'amber']),
      filledFlask([
        'amber',
        'verdant',
        'verdant',
        'amber',
        'crimson',
        'azure',
        'verdant'
      ]),
      emptyFlask(6)
    ]
  },
  {
    minimumPours: 39,
    board: [
      partFilledFlask(7, [
        'violet',
        'pearl',
        'azure',
        'amber',
        'amber',
        'violet'
      ]),
      partFilledFlask(6, ['amber', 'crimson', 'azure', 'verdant', 'saffron']),
      partFilledFlask(4, ['azure', 'crimson']),
      filledFlask(['crimson', 'azure', 'amber', 'azure', 'pearl']),
      filledFlask([
        'crimson',
        'violet',
        'crimson',
        'saffron',
        'verdant',
        'saffron'
      ]),
      filledFlask([
        'violet',
        'verdant',
        'amber',
        'violet',
        'crimson',
        'pearl',
        'verdant'
      ]),
      partFilledFlask(7, ['crimson', 'pearl', 'verdant', 'azure', 'verdant']),
      partFilledFlask(3, ['amber', 'azure'])
    ]
  },
  {
    minimumPours: 43,
    board: [
      partFilledFlask(4, ['saffron', 'azure']),
      filledFlask([
        'crimson',
        'azure',
        'azure',
        'amber',
        'verdant',
        'azure',
        'violet'
      ]),
      partFilledFlask(4, ['verdant', 'amber', 'azure']),
      partFilledFlask(6, ['pearl', 'crimson', 'pearl', 'verdant', 'violet']),
      partFilledFlask(7, [
        'crimson',
        'azure',
        'violet',
        'crimson',
        'violet',
        'pearl'
      ]),
      partFilledFlask(6, ['verdant', 'pearl', 'amber', 'crimson', 'indigo']),
      filledFlask([
        'saffron',
        'indigo',
        'violet',
        'amber',
        'indigo',
        'crimson',
        'saffron'
      ]),
      partFilledFlask(3, ['saffron', 'verdant']),
      filledFlask(['crimson', 'amber', 'verdant', 'amber', 'azure'])
    ]
  },
  {
    minimumPours: 38,
    board: [
      partFilledFlask(7, [
        'crimson',
        'crimson',
        'verdant',
        'violet',
        'amber',
        'saffron'
      ]),
      partFilledFlask(3, ['azure', 'amber']),
      partFilledFlask(6, ['azure', 'indigo', 'verdant', 'verdant', 'crimson']),
      filledFlask([
        'saffron',
        'amber',
        'violet',
        'crimson',
        'crimson',
        'amber',
        'violet'
      ]),
      partFilledFlask(4, ['indigo', 'saffron', 'pearl']),
      partFilledFlask(4, ['azure', 'crimson', 'violet']),
      partFilledFlask(5, ['crimson', 'azure', 'azure']),
      filledFlask([
        'azure',
        'pearl',
        'violet',
        'amber',
        'verdant',
        'indigo',
        'verdant'
      ]),
      filledFlask(['pearl', 'azure', 'saffron', 'verdant', 'amber', 'pearl'])
    ]
  },
  {
    minimumPours: 36,
    board: [
      filledFlask(['indigo', 'verdant', 'violet']),
      filledFlask([
        'pearl',
        'azure',
        'amber',
        'pearl',
        'crimson',
        'pearl',
        'saffron'
      ]),
      partFilledFlask(6, ['crimson', 'saffron', 'saffron', 'pearl']),
      filledFlask(['crimson', 'amber', 'amber', 'verdant']),
      partFilledFlask(7, [
        'azure',
        'crimson',
        'crimson',
        'amber',
        'pearl',
        'azure'
      ]),
      partFilledFlask(5, ['indigo', 'amber', 'violet', 'indigo']),
      partFilledFlask(7, [
        'azure',
        'crimson',
        'azure',
        'violet',
        'crimson',
        'verdant'
      ]),
      partFilledFlask(6, ['amber', 'verdant', 'verdant', 'violet', 'violet']),
      partFilledFlask(5, ['saffron', 'verdant', 'azure', 'azure'])
    ]
  },
  {
    minimumPours: 41,
    board: [
      partFilledFlask(7, [
        'azure',
        'crimson',
        'verdant',
        'crimson',
        'violet',
        'azure'
      ]),
      partFilledFlask(5, ['indigo', 'verdant', 'verdant', 'indigo']),
      partFilledFlask(3, ['azure', 'amber']),
      partFilledFlask(5, ['saffron', 'pearl', 'verdant', 'crimson']),
      filledFlask([
        'crimson',
        'violet',
        'crimson',
        'saffron',
        'pearl',
        'pearl'
      ]),
      filledFlask([
        'saffron',
        'amber',
        'saffron',
        'amber',
        'verdant',
        'pearl',
        'amber'
      ]),
      filledFlask(['indigo', 'violet', 'pearl', 'amber', 'violet', 'crimson']),
      partFilledFlask(4, ['crimson', 'azure']),
      partFilledFlask(7, [
        'amber',
        'azure',
        'azure',
        'azure',
        'violet',
        'verdant'
      ])
    ]
  }
]

/**
 * A level's id is its place in this list, counted from one. Deriving it here
 * rather than writing it into the data keeps every id unique and in play order
 * no matter how the list is edited.
 */
export const LEVELS: readonly Level[] = LAYOUTS.map((layout, index) => ({
  ...layout,
  id: index + 1
}))
