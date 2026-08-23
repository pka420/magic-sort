import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCampaign } from './useCampaign'
import {
  readSavedRun,
  rememberBench,
  rememberCampaign
} from '../storage/savedRun'
import { benchOfGlass } from '../test/bench'
import { lendStorage, refuseToRemember } from '../test/storage'
import type { Level } from '../domain/levels'

const bench = (id: string, name: string): Level => ({
  id,
  name,
  minimumPours: 1,
  board: benchOfGlass(4, ['crimson', 'crimson', 'crimson'], ['crimson'])
})

const atelier: readonly Level[] = [
  bench('first', 'First Bench'),
  bench('second', 'Second Bench'),
  bench('third', 'Third Bench')
]

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCampaign', () => {
  it('opens on the first bench of the atelier', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current).toMatchObject({
      level: atelier[0],
      position: 1,
      levelCount: 3,
      hasNext: true,
      bankedScore: 0,
      forfeited: 0
    })
  })

  it('moves on to the next bench once the apprentice has earned it', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({
      level: atelier[1],
      position: 2,
      hasNext: true
    })
  })

  it('has no bench left to offer after the last one', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({
      level: atelier[2],
      position: 3,
      hasNext: false
    })
  })

  it('stays on the last bench when there is nowhere further to go', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({ level: atelier[2], position: 3 })
  })

  it('banks what the apprentice earned on the bench they are leaving', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(850))

    expect(result.current.bankedScore).toBe(850)
  })

  it('adds up what every bench earned along the way', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(850))
    act(() => result.current.advance(1000))

    expect(result.current).toMatchObject({ bankedScore: 1850, position: 3 })
  })

  it('banks nothing more once there is no bench left to leave', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(850))
    act(() => result.current.advance(1000))
    act(() => result.current.advance(1000))

    expect(result.current.bankedScore).toBe(1850)
  })

  it('keeps a tally of what restarts have cost, to own up to it', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(2000))
    act(() => result.current.chargeForRestart())
    act(() => result.current.chargeForRestart())

    expect(result.current).toMatchObject({ forfeited: 400, bankedScore: 1600 })
  })

  /* A later bench pays more, so throwing one away costs more. */
  it('charges for a restart against the bench being thrown away', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))
    act(() => result.current.chargeForRestart())

    expect(result.current.bankedScore).toBe(800)
  })

  it('hands over what the bench in front of the apprentice pays', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))

    expect(result.current.worth).toBe(2000)
  })

  it('scores the atelier out of a flawless run of every bench', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current.perfectTotal).toBe(6000)
  })

  /*
   * Nothing in the atelier is bought on credit, so the ledger has no red in it:
   * a price the apprentice cannot pay ends their run instead, which is asked of
   * the domain where the bench is in view too. This floor is here for the runs
   * saved back when debt was a thing — they read as having nothing left rather
   * than as a debt the game no longer knows how to end.
   */
  it('reads a run saved in the red as one with nothing left', () => {
    lendStorage()
    rememberCampaign({ reached: 1, earned: 500, forfeited: 3000, rebirths: 0 })

    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current.bankedScore).toBe(0)
  })

  it('opens a fresh run for the apprentice who begins again', () => {
    const { result } = renderHook(() => useCampaign(atelier))

    act(() => result.current.advance(1000))
    act(() => result.current.beginAgain())

    expect(result.current).toMatchObject({
      level: atelier[0],
      position: 1,
      bankedScore: 0,
      forfeited: 0,
      perfectTotal: 6000
    })
  })

  /*
   * Closing the tab is not a way out of a campaign. Everything the apprentice
   * has earned and everything they owe comes back with them, or the price of
   * a restart would be a page reload away from being no price at all.
   */
  it('picks the campaign back up where the apprentice left it', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useCampaign(atelier))
    act(() => result.current.advance(850))
    unmount()

    const { result: onReturn } = renderHook(() => useCampaign(atelier))

    expect(onReturn.current).toMatchObject({
      level: atelier[1],
      position: 2,
      bankedScore: 850
    })
  })

  it('brings what restarts have cost back with the apprentice', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useCampaign(atelier))
    act(() => result.current.advance(1000))
    act(() => result.current.chargeForRestart())
    unmount()

    const { result: onReturn } = renderHook(() => useCampaign(atelier))

    expect(onReturn.current).toMatchObject({
      forfeited: 200,
      bankedScore: 800
    })
  })

  /*
   * Saved runs carry a rebirth count from when the walk back to the first bench
   * still existed. The ceiling has to keep reading against it, or an apprentice
   * returning with one would find their total over the top of the scoreboard.
   */
  it('holds the ceiling a saved rebirth raised, so the total still reads against it', () => {
    lendStorage()
    rememberCampaign({ reached: 0, earned: 1000, forfeited: 0, rebirths: 1 })

    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current.perfectTotal).toBe(12000)
  })

  /*
   * Beginning again is the one way out of a run, and it has to be a clean one:
   * the save is wiped rather than written over, so the half-sorted bench the
   * apprentice walked away from cannot come back with the next reload.
   */
  it('leaves nothing of the old run behind when a new one is begun', () => {
    lendStorage()
    const { result } = renderHook(() => useCampaign(atelier))
    act(() => result.current.advance(850))
    rememberBench({
      levelId: 'second',
      pours: 3,
      board: [{ capacity: 4, contents: ['crimson'] }]
    })

    act(() => result.current.beginAgain())

    expect(readSavedRun()).toEqual({
      campaign: { reached: 0, earned: 0, forfeited: 0, rebirths: 0 },
      bench: null
    })
  })

  it('opens on a bench the atelier still has when a save points past its end', () => {
    lendStorage()
    rememberCampaign({
      reached: 99,
      earned: 4200,
      forfeited: 0,
      rebirths: 0
    })

    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current).toMatchObject({ level: atelier[2], position: 3 })
  })

  it('opens the atelier fresh where the browser refuses to remember anything', () => {
    refuseToRemember()

    const { result } = renderHook(() => useCampaign(atelier))

    expect(result.current).toMatchObject({ position: 1, bankedScore: 0 })
  })
})
