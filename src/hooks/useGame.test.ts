import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGame } from './useGame'
import { levelWorth } from '../domain/scoring'
import { boardOfGlass } from '../test/board'
import { lendStorage } from '../test/storage'
import type { Level } from '../domain/levels'

/** Every level below is played as the opening one, which pays a thousand. */
const worth = levelWorth(1)

/** Two pours from being solved, so tests stay short and readable. */
const almostSolved: Level = {
  id: 1,
  minimumPours: 1,
  board: boardOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure']
  )
}

/** Flask 2 can never pour onto flask 0, which gives tests an illegal move. */
const mixed: Level = {
  id: 2,
  minimumPours: 4,
  board: boardOfGlass(4, ['crimson', 'azure'], ['azure'], ['verdant'], [])
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useGame', () => {
  it('starts on the given level with nothing selected and no pours spent', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    expect(result.current).toMatchObject({
      board: mixed.board,
      selectedIndex: null,
      pours: 0,
      isSolved: false
    })
  })

  it('selects a flask that has elixir to pour', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))

    expect(result.current.selectedIndex).toBe(0)
  })

  it('ignores a tap on an empty flask when nothing is selected', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(3))

    expect(result.current.selectedIndex).toBeNull()
  })

  it('puts a selected flask back down when it is tapped again', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(0))

    expect(result.current.selectedIndex).toBeNull()
  })

  it('pours from the selected flask into the flask tapped next', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))

    expect(result.current.board).toEqual(
      boardOfGlass(4, ['crimson'], ['azure', 'azure'], ['verdant'], [])
    )
  })

  it('counts a successful pour and clears the selection', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))

    expect(result.current).toMatchObject({ pours: 1, selectedIndex: null })
  })

  it('leaves the board and the pour count alone when the pour is illegal', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(0))

    expect(result.current).toMatchObject({ board: mixed.board, pours: 0 })
  })

  it('puts both flasks down when the pour is illegal', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(0))

    expect(result.current.selectedIndex).toBeNull()
  })

  it('names the flask that refused the pour, so the UI can rebuff the player', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(0))

    expect(result.current.lastTap).toMatchObject({ refusedFlaskIndex: 0 })
  })

  it('reports the level solved once every flask holds a single elixir', () => {
    const { result } = renderHook(() => useGame(almostSolved, worth))

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(result.current.isSolved).toBe(true)
  })

  it('scores completed flasks plus the bonus for a run at the fewest pours', () => {
    const { result } = renderHook(() => useGame(almostSolved, worth))

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(result.current.score).toBe(1000)
  })

  /* The same level, played later in the campaign, pays what it is worth there. */
  it('scores the run against what this level is worth', () => {
    const { result } = renderHook(() => useGame(almostSolved, levelWorth(7)))

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(result.current.score).toBe(7000)
  })

  it('scores completed flasks while the level is still in progress', () => {
    const { result } = renderHook(() => useGame(almostSolved, worth))

    expect(result.current.score).toBe(250)
  })

  it('reports picking a flask up so the UI can react to it', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))

    expect(result.current.lastTap).toMatchObject({ outcome: 'picked-up' })
  })

  it('reports a refused pour so the UI can react to it', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(0))

    expect(result.current.lastTap).toMatchObject({ outcome: 'refused' })
  })

  it('reports a completed pour so the UI can react to it', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))

    expect(result.current.lastTap).toMatchObject({ outcome: 'poured' })
  })

  it('names the flask a pour just filled, so the UI can celebrate it', () => {
    const { result } = renderHook(() => useGame(almostSolved, worth))

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(result.current.lastTap).toMatchObject({ completedFlaskIndex: 0 })
  })

  it('names no flask when the pour leaves the target unfinished', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))

    expect(result.current.lastTap).toMatchObject({ completedFlaskIndex: null })
  })

  it('gives repeated identical taps a fresh sequence so effects re-fire', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    const first = result.current.lastTap
    act(() => result.current.tapFlask(0))

    expect(result.current.lastTap.sequence).toBeGreaterThan(first.sequence)
  })

  it('lays out a fresh board when it is handed a different level', () => {
    const { result, rerender } = renderHook(
      ({ level }) => useGame(level, worth),
      {
        initialProps: { level: mixed }
      }
    )

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    rerender({ level: almostSolved })

    expect(result.current).toMatchObject({
      board: almostSolved.board,
      pours: 0,
      selectedIndex: null
    })
  })

  it('sends the board back to its opening state on restart', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.restart())

    expect(result.current).toMatchObject({
      board: mixed.board,
      pours: 0,
      selectedIndex: null
    })
  })

  /*
   * The pours already spent are the point. A board that came back laid out
   * afresh would make closing the tab a restart that costs nothing, which is
   * the one thing a restart is not supposed to be.
   */
  it('hands the player back the board they left part-solved', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useGame(mixed, worth))
    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    const leftBehind = result.current.board
    unmount()

    const { result: onReturn } = renderHook(() => useGame(mixed, worth))

    expect(onReturn.current).toMatchObject({ board: leftBehind, pours: 1 })
  })

  it('lays out a fresh board when the saved one belongs to another level', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useGame(mixed, worth))
    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    unmount()

    const { result: onReturn } = renderHook(() => useGame(almostSolved, worth))

    expect(onReturn.current).toMatchObject({
      board: almostSolved.board,
      pours: 0
    })
  })

  it('restarts to the opening board rather than to the one that was saved', () => {
    lendStorage()
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.restart())

    expect(result.current).toMatchObject({ board: mixed.board, pours: 0 })
  })

  it('takes back the last pour, and the pour it spent with it', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.undo())

    expect(result.current).toMatchObject({ board: mixed.board, pours: 0 })
  })

  /* Changing your mind is free: the score is counted off the board and the
     pours, so it climbs back to where it stood without a charge for it. */
  it('hands back the score the pour had spent', () => {
    const { result } = renderHook(() => useGame(mixed, worth))
    const before = result.current.score

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.undo())

    expect(result.current.score).toBe(before)
  })

  it('reaches only one pour back', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(3))
    act(() => result.current.undo())

    // The first pour still stands: only the second was taken back.
    expect(result.current).toMatchObject({
      board: boardOfGlass(4, ['crimson'], ['azure', 'azure'], ['verdant'], []),
      pours: 1,
      canUndo: false
    })
  })

  it('has nothing to take back before the first pour lands', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    expect(result.current.canUndo).toBe(false)
    act(() => result.current.undo())

    expect(result.current).toMatchObject({ board: mixed.board, pours: 0 })
  })

  it('keeps the pour undoable through a pick-up that comes to nothing', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(2))
    act(() => result.current.undo())

    expect(result.current).toMatchObject({ board: mixed.board, pours: 0 })
  })

  /* An undo is not a pour played in reverse: the tap is reported as ignored,
     so no sound plays and no flask rebuffs the player for it. */
  it('plays no sound backwards when a pour is taken back', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.undo())

    expect(result.current.lastTap).toMatchObject({ outcome: 'ignored' })
  })

  it('forgets the pour once the level is restarted', () => {
    const { result } = renderHook(() => useGame(mixed, worth))

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    act(() => result.current.restart())

    expect(result.current.canUndo).toBe(false)
  })

  /* A board carried in from a save belongs to another visit: the pours it
     holds were spent then, and this visit has none of them to take back. */
  it('offers nothing to take back on a board handed back from a save', () => {
    lendStorage()
    const { result, unmount } = renderHook(() => useGame(mixed, worth))
    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))
    unmount()

    const { result: onReturn } = renderHook(() => useGame(mixed, worth))

    expect(onReturn.current.canUndo).toBe(false)
  })
})
