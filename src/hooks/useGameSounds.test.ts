import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGame } from './useGame'
import { useGameSounds } from './useGameSounds'
import { playSound } from '../audio/sounds'
import { levelWorth } from '../domain/scoring'
import { boardOfGlass } from '../test/board'
import type { Level } from '../domain/levels'

// Audio playback is a genuine boundary, so it is the one thing stubbed here.
vi.mock('../audio/sounds', () => ({ playSound: vi.fn() }))

const level: Level = {
  id: 1,
  minimumPours: 4,
  board: boardOfGlass(4, ['crimson', 'azure'], ['azure'], ['verdant'], [])
}

/** Tapping flask 2 then flask 1 completes a flask and solves the level. */
const finalPour: Level = {
  id: 2,
  minimumPours: 1,
  board: boardOfGlass(
    4,
    ['crimson', 'crimson', 'crimson'],
    ['crimson'],
    ['azure', 'azure', 'azure', 'azure']
  )
}

function renderGameWithSound(level: Level) {
  return renderHook(() => {
    const game = useGame(level, levelWorth(1))
    useGameSounds(game)
    return game
  })
}

beforeEach(() => {
  vi.mocked(playSound).mockClear()
})

describe('useGameSounds', () => {
  it('chimes when a flask is picked up', () => {
    const { result } = renderGameWithSound(level)

    act(() => result.current.tapFlask(0))

    expect(playSound).toHaveBeenCalledWith('pickup')
  })

  it('splashes when elixir is poured', () => {
    const { result } = renderGameWithSound(level)

    act(() => result.current.tapFlask(0))
    act(() => result.current.tapFlask(1))

    expect(playSound).toHaveBeenCalledWith('pour')
  })

  it('thuds when the pour is refused', () => {
    const { result } = renderGameWithSound(level)

    act(() => result.current.tapFlask(2))
    act(() => result.current.tapFlask(0))

    expect(playSound).toHaveBeenCalledWith('refused')
  })

  it('rings a brighter chime when a pour completes a flask', () => {
    const { result } = renderGameWithSound(finalPour)

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(playSound).toHaveBeenCalledWith('complete')
  })

  it('plays the fanfare once the level is solved', () => {
    const { result } = renderGameWithSound(finalPour)

    act(() => result.current.tapFlask(1))
    act(() => result.current.tapFlask(0))

    expect(playSound).toHaveBeenCalledWith('victory')
  })

  it('stays quiet until the player does something', () => {
    renderGameWithSound(level)

    expect(playSound).not.toHaveBeenCalled()
  })
})
