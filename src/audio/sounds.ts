import { Howl } from 'howler'
import completeUrl from './complete.wav'
import pickupUrl from './pickup.wav'
import pourUrl from './pour.wav'
import refusedUrl from './refused.wav'
import resetUrl from './reset.wav'
import victoryUrl from './victory.wav'
// The recorded sounds, rather than synthesised ones. See
// scripts/generate-sounds.mjs for why they are the exceptions.
import defeatUrl from './defeat.mp3'
import reviveUrl from './revive.mp3'

export type SoundName =
  | 'pickup'
  | 'pour'
  | 'refused'
  | 'complete'
  | 'reset'
  | 'revive'
  | 'defeat'
  | 'victory'

const sources: Record<SoundName, string> = {
  pickup: pickupUrl,
  pour: pourUrl,
  refused: refusedUrl,
  complete: completeUrl,
  reset: resetUrl,
  revive: reviveUrl,
  defeat: defeatUrl,
  victory: victoryUrl
}

const isAudioAvailable =
  typeof window !== 'undefined' && 'AudioContext' in window

const loaded = new Map<SoundName, Howl>()

export function playSound(name: SoundName): void {
  if (!isAudioAvailable) return
  soundFor(name).play()
}

/**
 * Fetches a sound before anything asks to hear it, for the ones that must not
 * be late. Loading on first play is the right bargain almost everywhere, but
 * the recorded tracks are longer than the synthesised ones, and fetching one
 * at the moment of the click put the sound audibly behind it.
 */
export function warmSound(name: SoundName): void {
  if (!isAudioAvailable) return
  soundFor(name)
}

// Loading on first play keeps the initial page weight down and sidesteps
// browsers that only allow audio after a user gesture.
function soundFor(name: SoundName): Howl {
  const existing = loaded.get(name)
  if (existing !== undefined) return existing

  const howl = new Howl({ src: [sources[name]], volume: 0.55 })
  loaded.set(name, howl)
  return howl
}
