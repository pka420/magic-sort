import { useEffect } from 'react'
import { playSound } from '../audio/sounds'
import type { Game, LastTap } from './useGame'
import type { SoundName } from '../audio/sounds'

/** Gives the board its voice. Reacts to the game; never changes it. */
export function useGameSounds(game: Game): void {
  useEffect(() => {
    const sound = soundForTap(game.lastTap)
    if (sound !== null) playSound(sound)
  }, [game.lastTap])

  useEffect(() => {
    if (game.isSolved) playSound('victory')
  }, [game.isSolved])
}

function soundForTap(tap: LastTap): SoundName | null {
  switch (tap.outcome) {
    case 'poured':
      return tap.completedFlaskIndex === null ? 'pour' : 'complete'
    case 'picked-up':
    case 'put-down':
      return 'pickup'
    case 'refused':
      return 'refused'
    case 'ignored':
      return null
  }
}
