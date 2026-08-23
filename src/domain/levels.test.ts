import { describe, expect, it } from 'vitest'
import { LEVELS } from './levels'
import { isComplete } from './flask'
import { flasksToFill } from './board'
import { possibilitiesOf } from '../test/possibilities'
import { shortestSolution } from '../test/shortestSolution'
import type { Possibilities } from '../test/possibilities'
import type { Level } from './levels'

function elixirTally(level: Level): Record<string, number> {
  const tally: Record<string, number> = {}
  for (const flask of level.board) {
    for (const elixir of flask.contents) {
      tally[elixir] = (tally[elixir] ?? 0) + 1
    }
  }
  return tally
}

/**
 * Walking a level's arrangements is the most expensive thing this suite does,
 * and three tests ask about the same fifty levels. Each one is walked once.
 */
const walked = new Map<number, Possibilities>()

function possibilitiesFor(level: Level): Possibilities {
  const known = walked.get(level.id)
  if (known !== undefined) return known

  const measured = possibilitiesOf(level.board)
  walked.set(level.id, measured)
  return measured
}

/** How much of a level is a trap: the share of its arrangements already lost. */
function lostShare(level: Level): number {
  const { reachable, lost } = possibilitiesFor(level)
  return lost / reachable
}

function describeShare(level: Level): string {
  return `level ${level.id}: ${Math.round(100 * lostShare(level))}% of its arrangements lost`
}

/**
 * The mechanic a level is built on: the glass it is laid out in, largest
 * first, and whether the room it leaves is scattered through part-filled glass
 * instead of pooled in flasks standing empty. It is what names a tier — one
 * size of glass is the plain level, two sizes is the level where the small
 * vial is the whole puzzle, and scattered room is the level with nowhere to
 * pour a run out to.
 */
function mechanicOf(level: Level): string {
  const glass = [...new Set(level.board.map((flask) => flask.capacity))]
    .sort((first, second) => second - first)
    .join('/')

  return hasScatteredRoom(level) ? `${glass} scattered` : glass
}

function hasScatteredRoom(level: Level): boolean {
  return level.board.some(
    (flask) =>
      flask.contents.length > 0 && flask.contents.length < flask.capacity
  )
}

/** The dials a level is built from, named so a failure says which level. */
interface Rung {
  readonly label: string
  readonly mechanic: string
  readonly elixirs: number
  readonly spares: number
  /** How many of this level's arrangements can no longer be sorted. */
  readonly lost: number
}

/**
 * The room a level leaves: flasks that end up empty. Two is room to think in,
 * one is barely any, and the difference between them is what a player feels.
 */
const ROOM_TO_LEARN = 2
const MINIMUM_ROOM = 1

/**
 * What a level with room to think in may cost a player, and what a level
 * without it has to. Measured as a share of everything the level can be poured
 * into, so it says the same thing about a level of any size.
 */
const FORGIVING = 0.1
const MERCILESS = 0.3

function rungOf(level: Level): Rung {
  const elixirs = flasksToFill(level.board)

  return {
    label: `level ${level.id}`,
    mechanic: mechanicOf(level),
    elixirs,
    spares: level.board.length - elixirs,
    lost: possibilitiesFor(level).lost
  }
}

/**
 * The levels grouped by the mechanic they share, in the order they are played.
 */
function tiersOf(levels: readonly Level[]): Rung[][] {
  const tiers: Rung[][] = []

  for (const level of levels) {
    const rung = rungOf(level)
    const tier = tiers.at(-1)

    if (tier === undefined || tier[0].mechanic !== rung.mechanic) {
      tiers.push([])
    }
    tiers[tiers.length - 1].push(rung)
  }

  return tiers
}

/**
 * Within a tier, harder means fewer spare flasks first and more elixirs
 * second. Spares outrank elixirs because they decide how much room a level
 * leaves: the five-elixir level with one spare can only ever be arranged 65
 * ways against 3524 for the six-elixir level with two, and nearly half of
 * those 65 have already lost it.
 */
function byDifficulty(first: Rung, second: Rung): number {
  return second.spares - first.spares || first.elixirs - second.elixirs
}

/**
 * Every elixir has to end up sealed in a glass its layers exactly fill, so the
 * layer counts on a level must match its glass sizes one for one. On a level of
 * mixed glass that is the rule the player is really solving around: the elixir
 * with three layers has only the three-layer vials to end in.
 */
function elixirsWithNoGlassToFill(level: Level): string[] {
  const glasses = level.board.map((flask) => flask.capacity)
  const unmatched: string[] = []

  for (const [elixir, layers] of Object.entries(elixirTally(level))) {
    const glass = glasses.indexOf(layers)
    if (glass === -1) unmatched.push(`${elixir} fills ${layers} layers`)
    else glasses.splice(glass, 1)
  }

  return unmatched
}

describe('LEVELS', () => {
  it('numbers every level from one upwards in play order', () => {
    expect(LEVELS.map((level) => level.id)).toEqual(
      LEVELS.map((_, position) => position + 1)
    )
  })

  it('teaches one mechanic at a time and never goes back to an earlier one', () => {
    const tiers = tiersOf(LEVELS).map((tier) => tier[0].mechanic)

    expect(tiers).toEqual([...new Set(tiers)])
  })

  it('only ever turns a dial up from one level to the next on a tier', () => {
    const tiers = tiersOf(LEVELS)

    expect(tiers).toEqual(tiers.map((tier) => [...tier].sort(byDifficulty)))
  })

  /*
   * The fix for the complaint that the campaign goes slack past the fifth level:
   * a new mechanic used to buy three roomy levels in a row, and players felt
   * the game hand back everything it had just taught them to do without.
   */
  it('gives a new mechanic one roomy level, then takes the room back', () => {
    const [, ...tiers] = tiersOf(LEVELS)

    const room = tiers.map((tier) => ({
      tier: tier[0].mechanic,
      levels: tier.map((rung) => `${rung.label}: ${rung.spares} spare`)
    }))

    expect(room).toEqual(
      tiers.map((tier) => ({
        tier: tier[0].mechanic,
        levels: tier.map(
          (rung, level) =>
            `${rung.label}: ${level === 0 ? ROOM_TO_LEARN : MINIMUM_ROOM} spare`
        )
      }))
    )
  })

  /*
   * The exception, and the only one: the opening tier is teaching the game
   * itself rather than a mechanic on top of it, so it climbs by the weaker dial
   * before it starts taking flasks away.
   */
  it('lets the opening tier teach the game before it takes any room away', () => {
    const [onRamp] = tiersOf(LEVELS)
    const roomy = onRamp.filter((rung) => rung.spares === ROOM_TO_LEARN)

    expect(roomy.map((rung) => rung.label)).toEqual([
      'level 1',
      'level 2',
      'level 3'
    ])
  })

  /*
   * How hard a level is has nothing to do with how many pours it takes: the
   * shortest way through the last level of the campaign is not the longest in
   * it. What a player feels is how much of the level is a trap, and the spare
   * flask is what decides that — a level with one can be poured back out of
   * almost anywhere, and a level without one loses itself at every turn.
   */
  it('makes the spare flask the difference between room to think and a minefield', () => {
    const roomyButRuinous = LEVELS.filter(
      (level) =>
        level.board.length - flasksToFill(level.board) >= ROOM_TO_LEARN &&
        lostShare(level) >= FORGIVING
    )
    const tightButKind = LEVELS.filter(
      (level) =>
        level.board.length - flasksToFill(level.board) === MINIMUM_ROOM &&
        lostShare(level) < MERCILESS
    )

    expect({
      roomyButRuinous: roomyButRuinous.map(describeShare),
      tightButKind: tightButKind.map(describeShare)
    }).toEqual({ roomyButRuinous: [], tightButKind: [] })
  })

  /*
   * The climb itself, measured in possibilities rather than pours: once a tier
   * has taken the spare flask away, each level on it opens more ways to lose
   * than the one before. A new mechanic is where the count drops back, which is
   * the roomy level it arrives on.
   */
  it('opens more ways to lose a level with every level on a tier', () => {
    const tightening = tiersOf(LEVELS).map((tier) =>
      tier
        .filter((rung) => rung.spares === MINIMUM_ROOM)
        .map((rung) => ({ level: rung.label, lost: rung.lost }))
    )

    expect(tightening).toEqual(
      tightening.map((tier) =>
        [...tier].sort((first, second) => first.lost - second.lost)
      )
    )
  })

  it('saves the level with the most ways to be lost for last', () => {
    const last = LEVELS[LEVELS.length - 1]
    const asHard = LEVELS.slice(0, -1).filter(
      (level) => possibilitiesFor(level).lost >= possibilitiesFor(last).lost
    )

    expect({
      last: `level ${last.id}: ${possibilitiesFor(last).lost} lost`,
      levelsThatMatchIt: asHard.map(
        (level) => `level ${level.id}: ${possibilitiesFor(level).lost} lost`
      )
    }).toEqual({
      last: 'level 50: 3001 lost',
      levelsThatMatchIt: []
    })
  })

  it('gives every level an id of its own to be remembered by', () => {
    const ids = LEVELS.map((level) => level.id)

    expect(ids).toEqual([...new Set(ids)])
  })
})

describe.each(LEVELS)('level $id', (level: Level) => {
  it('has a glass that exactly fits every elixir it holds', () => {
    expect(elixirsWithNoGlassToFill(level)).toEqual([])
  })

  it('opens with no flask sorted for the player already', () => {
    expect(level.board.filter(isComplete)).toEqual([])
  })

  it('can be sorted in the pours it promises, and in no fewer', () => {
    expect(shortestSolution(level.board)).toHaveLength(level.minimumPours)
  })
})
