import { seal, unseal } from '../domain/vault'
import type { Board } from '../domain/board'
import type { Elixir } from '../domain/flask'

/*
 * The run a player comes back to, kept in the browser and sealed on the way
 * in. Storage is a boundary rather than a rule, which is why this sits outside
 * the domain: the sealing is pure and lives in the vault, and what is left
 * here is the one impure act of writing it down.
 *
 * It is deliberately one save rather than two. A player who deletes it loses
 * the level and the score together, so there is nothing to be gained by
 * reaching for it — where a separate board would have let them wipe a botched
 * layout and keep the campaign, which is a free restart.
 */
const KEPT_AS = 'magic-sort:run'

export interface SavedCampaign {
  /** How far into the campaign the player has reached, counted from zero. */
  readonly reached: number
  readonly earned: number
  readonly forfeited: number
  readonly rebirths: number
}

export interface SavedProgress {
  /** Which level this board was laid out from, so a stale one can be spotted. */
  readonly levelId: number
  readonly board: Board
  readonly pours: number
}

export interface SavedRun {
  readonly campaign: SavedCampaign
  /** Null when the player is at a level exactly as it was laid out. */
  readonly progress: SavedProgress | null
}

/** Where a player stands before they have earned anything at all. */
const FRESH_CAMPAIGN: SavedCampaign = {
  reached: 0,
  earned: 0,
  forfeited: 0,
  rebirths: 0
}

export function readSavedRun(): SavedRun | null {
  return asSavedRun(unseal(kept()))
}

/*
 * Each half of the run is written down by the part of the game that owns it,
 * and neither may drop the other on the way past — a board is saved before a
 * campaign on the very first visit, because React runs a child's effects
 * before its parent's, and the save has to come out the same either way.
 */
export function rememberCampaign(campaign: SavedCampaign): void {
  write({ campaign, progress: readSavedRun()?.progress ?? null })
}

/**
 * Writes down the board mid-solve, so that coming back is not a free restart:
 * a reload has to hand the player the pours they had already spent.
 */
export function rememberProgress(progress: SavedProgress): void {
  write({ campaign: readSavedRun()?.campaign ?? FRESH_CAMPAIGN, progress })
}

/**
 * Wipes the run off the machine. A player erasing their run is asking to be
 * gone rather than to be zeroed, so the entry is removed outright — the fresh
 * run that follows writes its own.
 */
export function forgetSavedRun(): void {
  try {
    window.localStorage.removeItem(KEPT_AS)
  } catch {
    // A private window or a hardened browser, which was never holding a run
    // to forget in the first place.
  }
}

function write(run: SavedRun): void {
  try {
    window.localStorage.setItem(KEPT_AS, seal(run))
  } catch {
    // A private window or a hardened browser. The run plays out in full and
    // is simply gone by the next visit.
  }
}

function kept(): string {
  try {
    return window.localStorage.getItem(KEPT_AS) ?? ''
  } catch {
    return ''
  }
}

function asSavedRun(value: unknown): SavedRun | null {
  if (!isRecord(value)) return null

  const campaign = asCampaign(value.campaign)
  if (campaign === null) return null

  return { campaign, progress: asProgress(value.progress) }
}

function asCampaign(value: unknown): SavedCampaign | null {
  if (!isRecord(value)) return null

  const { reached, earned, forfeited, rebirths } = value
  if (![reached, earned, forfeited, rebirths].every(isCount)) return null

  return {
    reached: reached as number,
    earned: earned as number,
    forfeited: forfeited as number,
    rebirths: rebirths as number
  }
}

function asProgress(value: unknown): SavedProgress | null {
  if (!isRecord(value)) return null
  if (typeof value.levelId !== 'number' || !isCount(value.pours)) return null

  const board = asBoard(value.board)
  if (board === null) return null

  return { levelId: value.levelId, board, pours: value.pours }
}

function asBoard(value: unknown): Board | null {
  if (!Array.isArray(value)) return null

  const board: Board = value.map(asFlask).filter((flask) => flask !== null)
  return board.length === value.length ? board : null
}

function asFlask(value: unknown) {
  if (!isRecord(value) || !isCount(value.capacity)) return null
  if (!Array.isArray(value.contents)) return null
  if (!value.contents.every((layer) => typeof layer === 'string')) return null

  /*
   * The layers are taken at their word rather than checked against the six
   * elixirs. Only this game ever writes a save, and an unknown colour would
   * paint a plain layer rather than break a board — which is a far smaller
   * price than teaching this boundary the palette.
   */
  return {
    capacity: value.capacity,
    contents: value.contents as readonly Elixir[]
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** A whole number a save can be trusted to hold: no NaN, no infinities. */
function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
