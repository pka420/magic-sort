export interface RunProgress {
  readonly completedFlasks: number
  /** How many flasks a sorted level ends up with: one per elixir. */
  readonly flasksToFill: number
  readonly pours: number
  /** The fewest pours that can sort this level. */
  readonly minimumPours: number
  /** What this level pays for a flawless run, which rises with its position. */
  readonly worth: number
  readonly solved: boolean
}

/** What the first level pays. Every level after it pays more. */
const FIRST_LEVEL_WORTH = 1000

/**
 * A pour past the fewest possible costs a fortieth of the level, so twenty
 * wasted pours cost the whole solving half wherever they are wasted.
 */
const POURS_THAT_COST_THE_SOLVING_HALF = 20

/**
 * What a level pays for a flawless run: another first level for every level
 * sorted to reach it, so the tenth is worth ten times the first.
 */
export function levelWorth(position: number): number {
  return FIRST_LEVEL_WORTH * position
}

/** What throwing this level away costs: a tenth of what it would have paid. */
export function priceOfRestart(position: number): number {
  return levelWorth(position) / 10
}

export interface Campaign {
  readonly levelCount: number
  /**
   * How many times an old save recorded going back to the first level. Nothing
   * raises it any more; saves still carry it, and the ceiling reads against
   * what they say.
   */
  readonly rebirths: number
}

/**
 * The ceiling on the scoreboard's total. Each rebirth recorded in an old save
 * handed back every level to sort a second time while its points were kept,
 * so each one opened another campaign's worth of points to earn.
 */
export function perfectTotal({ levelCount, rebirths }: Campaign): number {
  return campaignWorth(levelCount) * (rebirths + 1)
}

export interface CampaignProgress {
  /** Points from the levels left behind, less what restarts have cost. */
  readonly banked: number
  /** What the level in play is worth right now. */
  readonly current: number
}

/**
 * The number on the scoreboard's total. There is no red in it: nothing in the
 * campaign is bought on credit, so a price the player cannot pay ends their
 * run rather than being owed.
 */
export function totalScore({ banked, current }: CampaignProgress): number {
  return banked + current
}

export interface Restart {
  /** Points from the levels left behind, less what restarts have cost. */
  readonly banked: number
  /** Which level the player would be laying out again. */
  readonly position: number
}

/**
 * Whether the player can pay to lay this level out again.
 *
 * Only banked points can. Whatever the level in hand has earned is poured back
 * out with it, so it never pays for its own second chance — a level that did
 * would let a player bank the same flasks over and over.
 */
export function canPayForRestart({ banked, position }: Restart): boolean {
  return banked >= priceOfRestart(position)
}

export function scoreFor(progress: RunProgress): number {
  return sortingPoints(progress) + solvingPoints(progress)
}

function sortingPoints({
  completedFlasks,
  flasksToFill,
  worth
}: RunProgress): number {
  return Math.round((half(worth) * completedFlasks) / flasksToFill)
}

function solvingPoints(progress: RunProgress): number {
  if (!progress.solved) return 0

  const extraPours = Math.max(0, progress.pours - progress.minimumPours)
  return Math.max(
    0,
    half(progress.worth) - extraPours * pourPenalty(progress.worth)
  )
}

/**
 * What a pour past the fewest possible costs, which is the level's own worth
 * scaled: the price of wasting a pour has to rise with what a level pays, or
 * the late levels would hand out their points however clumsily they were sorted.
 */
export function pourPenalty(worth: number): number {
  return half(worth) / POURS_THAT_COST_THE_SOLVING_HALF
}

/** Half a level: what sorting it pays, and what solving it in time pays. */
function half(worth: number): number {
  return worth / 2
}

/** Every level up to and including this one, sorted flawlessly. */
function campaignWorth(levelCount: number): number {
  return (FIRST_LEVEL_WORTH * levelCount * (levelCount + 1)) / 2
}
