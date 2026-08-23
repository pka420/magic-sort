import { useCallback, useEffect, useState } from 'react'
import { levelWorth, perfectTotal, priceOfRestart } from '../domain/scoring'
import {
  forgetSavedRun,
  readSavedRun,
  rememberCampaign
} from '../storage/savedRun'
import type { Level } from '../domain/levels'

export interface Campaign {
  readonly level: Level
  /** One-based, the way the header counts it out for the player. */
  readonly position: number
  readonly levelCount: number
  readonly hasNext: boolean
  /** What a flawless run of the level in front of the player would pay. */
  readonly worth: number
  /** What the levels left behind earned, less what restarts have cost. */
  readonly bankedScore: number
  /** What restarts and rebirths have cost, to tell the player the price. */
  readonly forfeited: number
  /** The most this campaign could have scored by now, rebirths included. */
  readonly perfectTotal: number
  /**
   * Hands the player the next level, banking what they scored on this one.
   * Does nothing on the last level, so a run cannot be banked twice.
   */
  advance: (scoreEarned: number) => void
  /** Charges for throwing a level away and starting it again. */
  chargeForRestart: () => void
  /** Erases the run and opens one from nothing, points and board alike. */
  beginAgain: () => void
}

interface Progress {
  readonly reached: number
  readonly earned: number
  readonly forfeited: number
  /**
   * No longer raised by anything: the walk back to the first level is gone.
   * It survives the round trip because saved runs carry it, and the ceiling on
   * the scoreboard has to keep reading against what a save says it was.
   */
  readonly rebirths: number
}

export function useCampaign(levels: readonly Level[]): Campaign {
  const [progress, setProgress] = useState<Progress>(() =>
    openingProgress(levels)
  )

  // Written down on every change rather than on the way out: a browser tab is
  // closed without warning, and there is no last moment to be told about.
  useEffect(() => {
    rememberCampaign(progress)
  }, [progress])

  const lastPosition = levels.length - 1

  const advance = useCallback(
    (scoreEarned: number) => {
      setProgress((current) => {
        if (current.reached >= lastPosition) return current

        return {
          ...current,
          reached: current.reached + 1,
          earned: current.earned + scoreEarned
        }
      })
    },
    [lastPosition]
  )

  const chargeForRestart = useCallback(() => {
    setProgress((current) => ({
      ...current,
      forfeited: current.forfeited + priceOfRestart(current.reached + 1)
    }))
  }, [])

  /*
   * The save is wiped rather than written over. A player throwing a run away
   * is asking to be gone from the machine, and a half-sorted board left in the
   * save would otherwise be waiting for them at the next reload.
   */
  const beginAgain = useCallback(() => {
    forgetSavedRun()
    setProgress(freshProgress())
  }, [])

  const position = progress.reached + 1

  /*
   * Held at nothing rather than allowed into the red. Nothing here is bought on
   * credit — a price the player cannot pay ends their run instead — and the
   * floor is what runs saved back when debt was a thing come back as, rather
   * than as a debt the game no longer knows how to end.
   */
  const bankedScore = Math.max(0, progress.earned - progress.forfeited)

  return {
    level: levels[progress.reached],
    position,
    levelCount: levels.length,
    hasNext: progress.reached < lastPosition,
    worth: levelWorth(position),
    bankedScore,
    forfeited: progress.forfeited,
    perfectTotal: perfectTotal({
      levelCount: levels.length,
      rebirths: progress.rebirths
    }),
    advance,
    chargeForRestart,
    beginAgain
  }
}

/** Where a player stands before they have earned or owed anything. */
function freshProgress(): Progress {
  return { reached: 0, earned: 0, forfeited: 0, rebirths: 0 }
}

/** The run the player comes back to, or a fresh one for a first visit. */
function openingProgress(levels: readonly Level[]): Progress {
  const saved = readSavedRun()?.campaign
  if (saved === undefined) return freshProgress()

  return { ...saved, reached: withinLevels(levels, saved.reached) }
}

/*
 * A save outlives the campaign it was written in: levels are reordered and
 * dropped between builds, and a run pointing past the end of the list has to
 * land on a level that exists rather than on nothing at all.
 */
function withinLevels(levels: readonly Level[], reached: number): number {
  return Math.min(Math.max(0, Math.trunc(reached)), levels.length - 1)
}
