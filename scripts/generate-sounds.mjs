// Synthesises the game's sound effects into src/audio/*.wav.
//
// The sounds are generated rather than downloaded so the repository stays
// self-contained. Re-run with `npm run sounds` after editing a recipe.
//
// Two sounds are deliberately not recipes: the new run opening and the end of
// a run are recorded tracks at src/audio/revive.mp3 and src/audio/defeat.mp3.
// They have no entry here on purpose, so that regenerating the bench cannot
// overwrite them.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_RATE = 44100
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '../src/audio')

const sine = (phase) => Math.sin(phase * 2 * Math.PI)
const triangle = (phase) => 2 * Math.abs(2 * (phase % 1) - 1) - 1

/** Exponential decay with a short fade-in, which keeps onsets from clicking. */
function envelope(progress, attack = 0.01) {
  const attackGain = Math.min(1, progress / attack)
  return attackGain * Math.exp(-4 * progress)
}

function tone({
  from,
  to = from,
  duration,
  gain = 0.5,
  wave = sine,
  delay = 0
}) {
  const samples = new Float32Array(Math.round((delay + duration) * SAMPLE_RATE))
  const offset = Math.round(delay * SAMPLE_RATE)
  let phase = 0

  for (let i = 0; i < samples.length - offset; i++) {
    const progress = i / (duration * SAMPLE_RATE)
    phase += (from + (to - from) * progress) / SAMPLE_RATE
    samples[offset + i] = wave(phase) * envelope(progress) * gain
  }
  return samples
}

/** Lowpassed noise, which is the closest a synth gets to splashing liquid. */
function splash({ duration, gain = 0.5 }) {
  const samples = new Float32Array(Math.round(duration * SAMPLE_RATE))
  let previous = 0

  for (let i = 0; i < samples.length; i++) {
    const progress = i / samples.length
    // Random is fine here: the output is baked into a committed file.
    const noise = Math.random() * 2 - 1
    previous += (noise - previous) * 0.12
    const swell = Math.sin(progress * Math.PI)
    samples[i] = previous * swell * gain
  }
  return samples
}

function mix(...layers) {
  const length = Math.max(...layers.map((layer) => layer.length))
  const mixed = new Float32Array(length)

  for (const layer of layers) {
    for (let i = 0; i < layer.length; i++) mixed[i] += layer[i]
  }
  return mixed
}

function toWav(samples) {
  const header = Buffer.alloc(44)
  const body = Buffer.alloc(samples.length * 2)

  header.write('RIFF', 0)
  header.writeUInt32LE(36 + body.length, 4)
  header.write('WAVE', 8)
  header.write('fmt ', 12)
  header.writeUInt32LE(16, 16)
  header.writeUInt16LE(1, 20) // PCM
  header.writeUInt16LE(1, 22) // mono
  header.writeUInt32LE(SAMPLE_RATE, 24)
  header.writeUInt32LE(SAMPLE_RATE * 2, 28)
  header.writeUInt16LE(2, 32)
  header.writeUInt16LE(16, 34)
  header.write('data', 36)
  header.writeUInt32LE(body.length, 40)

  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    body.writeInt16LE(Math.round(clamped * 32767), i * 2)
  }
  return Buffer.concat([header, body])
}

const recipes = {
  pickup: () => tone({ from: 620, to: 940, duration: 0.11, gain: 0.32 }),

  pour: () =>
    mix(
      splash({ duration: 0.42, gain: 0.22 }),
      tone({ from: 440, to: 240, duration: 0.4, gain: 0.16, wave: triangle })
    ),

  // A flat, unmistakable "no". Two clashing mid tones carry further than a low
  // thud, which was too quiet to notice on laptop speakers.
  refused: () =>
    mix(
      tone({ from: 320, to: 190, duration: 0.26, gain: 0.42, wave: triangle }),
      tone({ from: 233, to: 150, duration: 0.26, gain: 0.34, wave: triangle }),
      splash({ duration: 0.09, gain: 0.16 })
    ),

  // A major triad rung as an arpeggio: the sound of a flask coming out pure.
  complete: () =>
    mix(
      tone({ from: 1046.5, duration: 0.5, gain: 0.22 }),
      tone({ from: 1318.5, duration: 0.5, gain: 0.2, delay: 0.06 }),
      tone({ from: 1568, duration: 0.55, gain: 0.18, delay: 0.12 })
    ),

  // Everything poured back out again: a sweep down through a wash of liquid.
  reset: () =>
    mix(
      tone({ from: 540, to: 120, duration: 0.5, gain: 0.28, wave: triangle }),
      splash({ duration: 0.44, gain: 0.26 })
    ),

  victory: () =>
    mix(
      ...[523.25, 659.25, 783.99, 1046.5].map((frequency, step) =>
        tone({
          from: frequency,
          duration: 0.7,
          gain: 0.2,
          delay: step * 0.12
        })
      )
    )
}

mkdirSync(OUTPUT_DIR, { recursive: true })

/*
 * Named on the command line, or all of them. Three of these recipes are built
 * on noise, so regenerating the whole bench to add one sound rewrites files
 * nobody touched with different random samples.
 */
const asked = process.argv.slice(2)
const wanted = asked.length > 0 ? asked : Object.keys(recipes)

for (const name of wanted) {
  const recipe = recipes[name]
  if (recipe === undefined) throw new Error(`No recipe for ${name}`)

  writeFileSync(join(OUTPUT_DIR, `${name}.wav`), toWav(recipe()))
  console.log(`wrote ${name}.wav`)
}
