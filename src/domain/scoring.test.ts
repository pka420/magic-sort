import { describe, expect, it } from 'vitest'
import {
  benchWorth,
  canPayForRestart,
  perfectTotal,
  priceOfRestart,
  scoreFor,
  totalScore
} from './scoring'
import type { RunProgress } from './scoring'

/** A four-elixir opening bench, nothing sorted yet, on the first shelf. */
const openingRun: RunProgress = {
  completedFlasks: 0,
  flasksToFill: 4,
  pours: 0,
  minimumPours: 10,
  worth: benchWorth(1),
  solved: false
}

/** Every flask sorted, in the fewest pours the bench allows. */
const flawlessRun = (worth: number): number =>
  scoreFor({
    completedFlasks: 4,
    flasksToFill: 4,
    pours: 10,
    minimumPours: 10,
    worth,
    solved: true
  })

describe('benchWorth', () => {
  it('pays the first bench a thousand points', () => {
    expect(benchWorth(1)).toBe(1000)
  })

  /*
   * The rule the whole economy hangs off: an apprentice who pushes on into the
   * harder benches must out-earn one who keeps sorting the easy ones.
   */
  it('pays every bench more than the one before it', () => {
    expect([1, 2, 3, 4].map(benchWorth)).toEqual([1000, 2000, 3000, 4000])
  })

  it('pays the last bench of the atelier fifty times the first', () => {
    expect(benchWorth(50)).toBe(50000)
  })
})

describe('scoreFor', () => {
  it('scores nothing before the first flask is finished', () => {
    expect(scoreFor(openingRun)).toBe(0)
  })

  it('pays a flawless run everything the bench is worth', () => {
    expect([1000, 2000, 50000].map(flawlessRun)).toEqual([1000, 2000, 50000])
  })

  it('gives half the points for sorting, shared out across the flasks to fill', () => {
    expect(scoreFor({ ...openingRun, completedFlasks: 2 })).toBe(250)
  })

  it('shares the sorting half out on a bench that does not divide evenly', () => {
    expect(
      scoreFor({ ...openingRun, flasksToFill: 6, completedFlasks: 5 })
    ).toBe(417)
  })

  it('withholds the other half until the bench is actually sorted', () => {
    expect(scoreFor({ ...openingRun, completedFlasks: 3, pours: 8 })).toBe(375)
  })

  it('shaves a fortieth of the bench off for every pour past the fewest', () => {
    expect(
      scoreFor({
        completedFlasks: 4,
        flasksToFill: 4,
        pours: 12,
        minimumPours: 10,
        worth: benchWorth(1),
        solved: true
      })
    ).toBe(950)
  })

  /* A late bench is worth more, so wasting a pour on one costs more. */
  it('makes a wasted pour cost more on a bench that pays more', () => {
    expect(
      scoreFor({
        completedFlasks: 4,
        flasksToFill: 4,
        pours: 12,
        minimumPours: 10,
        worth: benchWorth(10),
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
        worth: benchWorth(1),
        solved: true
      })
    ).toBe(500)
  })
})

describe('priceOfRestart', () => {
  it('charges a tenth of the bench being thrown away', () => {
    expect(priceOfRestart(1)).toBe(100)
  })

  it('charges more for throwing away a bench that pays more', () => {
    expect([1, 2, 50].map(priceOfRestart)).toEqual([100, 200, 5000])
  })
})

describe('totalScore', () => {
  it('adds what this bench is worth to what is already banked', () => {
    expect(totalScore({ banked: 1750, bench: 250 })).toBe(2000)
  })
})

describe('perfectTotal', () => {
  it('is every bench of the atelier sorted flawlessly', () => {
    expect(perfectTotal({ levelCount: 3, rebirths: 0 })).toBe(6000)
  })

  /*
   * A reborn apprentice keeps their points and sorts the atelier again, so the
   * ceiling has to make room for the second run of it. No walk back raises this
   * any more, but saved runs still carry the count, and the scoreboard has to
   * keep reading against what a save says it was.
   */
  it('opens another atelier to earn every time the apprentice is reborn', () => {
    expect(perfectTotal({ levelCount: 3, rebirths: 2 })).toBe(18000)
  })
})

describe('canPayForRestart', () => {
  it('lets an apprentice who has banked the price lay the bench out again', () => {
    expect(canPayForRestart({ banked: 100, position: 1 })).toBe(true)
  })

  /*
   * Nothing in the atelier is bought on credit: an apprentice who cannot cover
   * the price of throwing a bench away is at the end of their run rather than
   * in debt over it.
   */
  it('refuses the apprentice who has not banked what a restart costs', () => {
    expect(canPayForRestart({ banked: 99, position: 1 })).toBe(false)
  })

  /*
   * Only banked points can pay for a restart. Whatever the bench in hand has
   * earned is poured back out with it, so it is not asked about here — and a
   * bench that could pay for its own second chance would let an apprentice
   * bank the same flasks over and over.
   */
  it('asks more of an apprentice throwing away a bench that pays more', () => {
    expect(canPayForRestart({ banked: 400, position: 5 })).toBe(false)
  })
})
