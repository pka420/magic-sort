import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCampaign } from './useCampaign'
import {
  readSavedRun,
  rememberProgress,
  rememberCampaign
} from '../storage/savedRun'
import { boardOfGlass } from '../test/board'
import { lendStorage, refuseToRemember } from '../test/storage'
import type { Level } from '../domain/levels'

const makeLevel = (id: number): Level => ({
  id,
  minimumPours: 1,
  board: boardOfGlass(4, ['crimson', 'crimson', 'crimson'], ['crimson'])
})

const levels: readonly Level[] = [makeLevel(1), makeLevel(2), makeLevel(3)]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCampaign', () => {
  it('opens on the first level of the campaign', () => {
    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current).toMatchObject({
      level: levels[0],
      position: 1,
      levelCount: 3,
      hasNext: true,
      bankedScore: 0,
      forfeited: 0
    })
  })

  it('moves on to the next level once the player has earned it', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({
      level: levels[1],
      position: 2,
      hasNext: true
    })
  })

  it('has no level left to offer after the last one', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({
      level: levels[2],
      position: 3,
      hasNext: false
    })
  })

  it('stays on the last level when there is nowhere further to go', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({ level: levels[2], position: 3 })
  })

  it('banks what the player earned on the level they are leaving', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(850))

    expect(result.current.bankedScore).toBe(850)
  })

  it('adds up what every level earned along the way', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(850))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({ bankedScore: 1850, position: 3 })
  })

  it('banks nothing more once there is no level left to leave', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(850))
    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current.bankedScore).toBe(1850)
  })

  it('keeps a tally of what restarts have cost, to own up to it', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(2000))
    act(() => result.current.chargeForRestart())
    act(() => result.current.chargeForRestart())

    expect(result.current).toMatchObject({ forfeited: 400, bankedScore: 1600 })
  })

  /* A later level pays more, so throwing one away costs more. */
  it('charges for a restart against the level being thrown away', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))
    act(() => result.current.chargeForRestart())

    expect(result.current.bankedScore).toBe(800)
  })

  it('hands over what the level in front of the player pays', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))

    expect(result.current.worth).toBe(2000)
  })

  it('scores the campaign out of a flawless run of every level', () => {
    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current.perfectTotal).toBe(6000)
  })

  /*
   * Nothing in the game is bought on credit, so the ledger has no red in it:
   * a price the player cannot pay ends their run instead, which is asked of
   * the domain where the level is in view too. This floor is here for the runs
   * saved back when debt was a thing — they read as having nothing left rather
   * than as a debt the game no longer knows how to end.
   */
  it('reads a run saved in the red as one with nothing left', () => {
    lendStorage()
    rememberCampaign({ reached: 1, earned: 500, forfeited: 3000, rebirths: 0 })

    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current.bankedScore).toBe(0)
  })

  it('opens a fresh run for the player who begins again', () => {
    const { result } = renderHook(() => useCampaign(levels))

    act(() => result.current.advance(1000))
    act(() => result.current.beginAgain())

    expect(result.current).toMatchObject({
      level: levels[0],
      position: 1,
      bankedScore: 0,
      forfeited: 0,
      perfectTotal: 6000
    })
  })

  /*
   * Closing the tab is not a way out of a campaign. Everything the player
   * has earned and everything they owe comes back with them, or the price of
   * a restart would be a page reload away from being no price at all.
   */
  it('picks the campaign back up where the player left it', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useCampaign(levels))
    act(() => result.current.advance(850))
    unmount()

    const { result: onReturn } = renderHook(() => useCampaign(levels))

    expect(onReturn.current).toMatchObject({
      level: levels[1],
      position: 2,
      bankedScore: 850
    })
  })

  it('brings what restarts have cost back with the player', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useCampaign(levels))
    act(() => result.current.advance(1000))
    act(() => result.current.chargeForRestart())
    unmount()

    const { result: onReturn } = renderHook(() => useCampaign(levels))

    expect(onReturn.current).toMatchObject({
      forfeited: 200,
      bankedScore: 800
    })
  })

  /*
   * Saved runs carry a rebirth count from when the walk back to the first level
   * still existed. The ceiling has to keep reading against it, or a player
   * returning with one would find their total over the top of the scoreboard.
   */
  it('holds the ceiling a saved rebirth raised, so the total still reads against it', () => {
    lendStorage()
    rememberCampaign({ reached: 0, earned: 1000, forfeited: 0, rebirths: 1 })

    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current.perfectTotal).toBe(12000)
  })

  /*
   * Beginning again is the one way out of a run, and it has to be a clean one:
   * the save is wiped rather than written over, so the half-sorted level the
   * player walked away from cannot come back with the next reload.
   */
  it('leaves nothing of the old run behind when a new one is begun', () => {
    lendStorage()
    const { result } = renderHook(() => useCampaign(levels))
    act(() => result.current.advance(850))
    rememberProgress({
      levelId: 2,
      pours: 3,
      board: [{ capacity: 4, contents: ['crimson'] }]
    })

    act(() => result.current.beginAgain())

    expect(readSavedRun()).toEqual({
      campaign: { reached: 0, earned: 0, forfeited: 0, rebirths: 0 },
      progress: null
    })
  })

  it('opens on a level the campaign still has when a save points past its end', () => {
    lendStorage()
    rememberCampaign({
      reached: 99,
      earned: 4200,
      forfeited: 0,
      rebirths: 0
    })

    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current).toMatchObject({ level: levels[2], position: 3 })
  })

  it('opens the campaign fresh where the browser refuses to remember anything', () => {
    refuseToRemember()

    const { result } = renderHook(() => useCampaign(levels))

    expect(result.current).toMatchObject({ position: 1, bankedScore: 0 })
  })
})
