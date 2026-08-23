import { describe, expect, it } from 'vitest'
import {
  levelWorth,
  canPayForRestart,
  perfectTotal,
  priceOfRestart,
  scoreFor,
  totalScore
} from './scoring'
import type { RunProgress } from './scoring'

/** A four-elixir opening level, nothing sorted yet, on the first tier. */
const openingRun: RunProgress = {
  completedFlasks: 0,
  flasksToFill: 4,
  pours: 0,
  minimumPours: 10,
  worth: levelWorth(1),
  solved: false
}

/** Every flask sorted, in the fewest pours the level allows. */
const flawlessRun = (worth: number): number =>
  scoreFor({
    completedFlasks: 4,
    flasksToFill: 4,
    pours: 10,
    minimumPours: 10,
    worth,
    solved: true
  })

describe('levelWorth', () => {
  it('pays the first level a thousand points', () => {
    expect(levelWorth(1)).toBe(1000)
  })

  /*
   * The rule the whole economy hangs off: a player who pushes on into the
   * harder levels must out-earn one who keeps sorting the easy ones.
   */
  it('pays every level more than the one before it', () => {
    expect([1, 2, 3, 4].map(levelWorth)).toEqual([1000, 2000, 3000, 4000])
  })

  it('pays the last level of the campaign fifty times the first', () => {
    expect(levelWorth(50)).toBe(50000)
  })
})

describe('scoreFor', () => {
  it('scores nothing before the first flask is finished', () => {
    expect(scoreFor(openingRun)).toBe(0)
  })

  it('pays a flawless run everything the level is worth', () => {
    expect([1000, 2000, 50000].map(flawlessRun)).toEqual([1000, 2000, 50000])
  })

  it('gives half the points for sorting, shared out across the flasks to fill', () => {
    expect(scoreFor({ ...openingRun, completedFlasks: 2 })).toBe(250)
  })

  it('shares the sorting half out on a level that does not divide evenly', () => {
    expect(
      scoreFor({ ...openingRun, flasksToFill: 6, completedFlasks: 5 })
    ).toBe(417)
  })

  it('withholds the other half until the level is actually sorted', () => {
    expect(scoreFor({ ...openingRun, completedFlasks: 3, pours: 8 })).toBe(375)
  })

  it('shaves a fortieth of the worth off for every pour past the fewest', () => {
    expect(
      scoreFor({
        completedFlasks: 4,
        flasksToFill: 4,
        pours: 12,
        minimumPours: 10,
        worth: levelWorth(1),
        solved: true
      })
    ).toBe(950)
  })

  /* A late level is worth more, so wasting a pour on one costs more. */
  it('makes a wasted pour cost more on a level that pays more', () => {
    expect(
      scoreFor({
        completedFlasks: 4,
        flasksToFill: 4,
        pours: 12,
        minimumPours: 10,
        worth: levelWorth(10),
        solved: true
      })
    ).toBe(9500)
  })

  it('never lets a wasteful solve cost more than the solving half', () => {
    expect(
      scoreFor({
        completedFlasks: 4,
        flasksToFill: 4,
        pours: 100,
        minimumPours: 10,
        worth: levelWorth(1),
        solved: true
      })
    ).toBe(500)
  })
})

describe('priceOfRestart', () => {
  it('charges a tenth of the level being thrown away', () => {
    expect(priceOfRestart(1)).toBe(100)
  })

  it('charges more for throwing away a level that pays more', () => {
    expect([1, 2, 50].map(priceOfRestart)).toEqual([100, 200, 5000])
  })
})

describe('totalScore', () => {
  it('adds what this level is worth to what is already banked', () => {
    expect(totalScore({ banked: 1750, current: 250 })).toBe(2000)
  })
})

describe('perfectTotal', () => {
  it('is every level of the campaign sorted flawlessly', () => {
    expect(perfectTotal({ levelCount: 3, rebirths: 0 })).toBe(6000)
  })

  /*
   * A reborn player keeps their points and sorts the campaign again, so the
   * ceiling has to make room for the second run of it. No walk back raises this
   * any more, but saved runs still carry the count, and the scoreboard has to
   * keep reading against what a save says it was.
   */
  it('opens another campaign to earn every time the player is reborn', () => {
    expect(perfectTotal({ levelCount: 3, rebirths: 2 })).toBe(18000)
  })
})

describe('canPayForRestart', () => {
  it('lets a player who has banked the price lay the level out again', () => {
    expect(canPayForRestart({ banked: 100, position: 1 })).toBe(true)
  })

  /*
   * Nothing in the game is bought on credit: a player who cannot cover
   * the price of throwing a level away is at the end of their run rather than
   * in debt over it.
   */
  it('refuses the player who has not banked what a restart costs', () => {
    expect(canPayForRestart({ banked: 99, position: 1 })).toBe(false)
  })

  /*
   * Only banked points can pay for a restart. Whatever the level in hand has
   * earned is poured back out with it, so it is not asked about here — and a
   * level that could pay for its own second chance would let a player
   * bank the same flasks over and over.
   */
  it('asks more of a player throwing away a level that pays more', () => {
    expect(canPayForRestart({ banked: 400, position: 5 })).toBe(false)
  })
})
