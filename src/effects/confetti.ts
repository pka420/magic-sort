import confetti from 'canvas-confetti'

/** The elixir palette, so the confetti matches the colours on the board. */
const COLOURS = [
  '#ff4f6d',
  '#46b4ff',
  '#3fdba0',
  '#ffb340',
  '#a374ff',
  '#e8e4f7'
]

/** A modest puff over the flask that was just filled. */
export function celebrateFlask(flask: Element): void {
  if (!canCelebrate()) return

  const bounds = flask.getBoundingClientRect()

  confetti({
    particleCount: 45,
    spread: 62,
    startVelocity: 28,
    gravity: 0.9,
    scalar: 0.75,
    ticks: 120,
    colors: COLOURS,
    origin: {
      x: (bounds.left + bounds.width / 2) / window.innerWidth,
      y: bounds.top / window.innerHeight
    },
    disableForReducedMotion: true
  })
}

/** The whole level is sorted, so the screen fills with colour. */
export function celebrateLevel(): void {
  if (!canCelebrate()) return

  confetti({
    particleCount: 160,
    spread: 100,
    startVelocity: 45,
    ticks: 260,
    colors: COLOURS,
    origin: { y: 0.55 },
    disableForReducedMotion: true
  })

  for (const x of [0.1, 0.9]) {
    confetti({
      particleCount: 90,
      spread: 70,
      startVelocity: 55,
      angle: x < 0.5 ? 55 : 125,
      ticks: 260,
      colors: COLOURS,
      origin: { x, y: 0.75 },
      disableForReducedMotion: true
    })
  }
}

// Confetti needs a real 2D canvas. Test environments and text-mode browsers do
// not have one, and the game must carry on without the party.
function canCelebrate(): boolean {
  if (typeof document === 'undefined') return false
  return document.createElement('canvas').getContext('2d') !== null
}
