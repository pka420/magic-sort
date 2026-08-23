import { useCallback, useRef, useState } from 'react'
import { animate } from 'motion/react'
import { canPourBetween } from '../domain/board'
import { topElixir } from '../domain/flask'
import type { AnimationPlaybackControls } from 'motion/react'
import type { RefObject } from 'react'
import type { Board } from '../domain/board'
import type { Elixir, Flask } from '../domain/flask'

/**
 * The elixir falling out of a tipped flask, placed against the board it falls
 * onto rather than against the page.
 */
export interface Stream {
  readonly elixir: Elixir
  readonly left: number
  readonly top: number
  readonly height: number
}

/*
 * The choreography, in the order a player watches it: the flask lifts out of
 * its place and swings over the mouth of the one it is filling, tips, and the
 * elixir falls. The board changes at the moment the stream appears, so the
 * layers leave one flask and arrive in the other while the elixir is visibly
 * between them.
 */
const LIFT_SECONDS = 0.26
const STREAM_SECONDS = 0.15
const DRAIN_SECONDS = 0.1
const RETURN_SECONDS = 0.24
const TILT_DEGREES = 104
/**
 * How far the tipped flask clears the rim it is pouring into, in pixels. It is
 * measured from the flask's middle, which is what it turns about, so a flask
 * hangs over the board with daylight under it rather than lying across the
 * glass it is filling.
 *
 * A flask lying on its side reaches roughly half its own length below that
 * middle, so the clearance has to cover that overhang before it buys any
 * daylight at all: at 34 the glass was resting in the elixir it was pouring
 * onto. This leaves the mouth above the brim of a flask filled to the top,
 * which is the worst case and the one a player notices.
 */
const POURING_HEIGHT = 58

interface Flight {
  readonly x: number
  readonly y: number
  readonly rotate: number
  readonly stream: Stream
}

interface PourFlightProps {
  readonly board: Board
  readonly selectedIndex: number | null
  /** The board of flasks, which the stream is positioned against. */
  readonly flasksRef: RefObject<HTMLElement | null>
  /** Each flask's place on the board, which is what flies rather than the
   *  flask itself: the flask is already animating its own selection. */
  readonly slots: RefObject<(HTMLElement | null)[]>
  /** Hands the tap on to the game once the elixir has somewhere to land. */
  readonly onTap: (index: number) => void
  /** Animation speed multiplier: 0.5x to 3x. */
  readonly speed: number
}

export function usePourFlight({
  board,
  selectedIndex,
  flasksRef,
  slots,
  onTap,
  speed
}: PourFlightProps) {
  const [stream, setStream] = useState<Stream | null>(null)
  const inFlight = useRef<Pouring | null>(null)

  const tapFlask = useCallback(
    (index: number) => {
      /*
       * A player chaining pours is never made to wait for the animation: a tap
       * arriving mid-flight lands the elixir at once and puts the flask back.
       * The tap that interrupted is then read against the board as it now
       * stands, not against the one this render was drawn from.
       */
      if (inFlight.current !== null) {
        inFlight.current.cutShort()
        inFlight.current = null
        onTap(index)
        return
      }

      const source = selectedIndex
      const isPour =
        source !== null &&
        source !== index &&
        canPourBetween(board, source, index)

      if (!isPour) {
        onTap(index)
        return
      }

      const flask = slots.current?.[source]
      const filling = slots.current?.[index]
      const flight =
        flask && filling
          ? flightBetween(flasksRef.current, flask, filling, board[source])
          : null

      if (!flask || !filling || flight === null) {
        onTap(index)
        return
      }

      const pouring = pourOver(
        flask,
        filling,
        flight,
        setStream,
        () => onTap(index),
        speed
      )
      inFlight.current = pouring

      // Nothing waits on the choreography: the tap is over, and the board is
      // told about the pour from inside it.
      pouring.finished.then(() => {
        if (inFlight.current === pouring) inFlight.current = null
      })
    },
    [board, selectedIndex, flasksRef, slots, onTap, speed]
  )

  return { tapFlask, stream }
}

interface Pouring {
  readonly finished: Promise<void>
  /** Lands the elixir now and puts the flask straight back on the board. */
  readonly cutShort: () => void
}

function pourOver(
  flask: HTMLElement,
  filling: HTMLElement,
  flight: Flight,
  showStream: (stream: Stream | null) => void,
  settle: () => void,
  speed: number
): Pouring {
  let travelling: AnimationPlaybackControls | null = null
  let landed = false
  let cut = false

  // The board takes the pour exactly once, whether the elixir got there by
  // falling or by the player cutting the fall short.
  const land = () => {
    if (landed) return
    landed = true
    settle()
  }

  const settleBench = () => {
    flask.style.zIndex = ''
    flask.style.pointerEvents = ''
    filling.style.zIndex = ''
  }

  const putBack = () => {
    showStream(null)
    /*
     * Back through motion rather than by clearing the inline style: motion owns
     * the transform it wrote, and a flask whose style is wiped out from under
     * it is left hanging over the board where it was cut off.
     */
    animate(flask, { x: 0, y: 0, rotate: 0 }, { duration: 0 })
    settleBench()
  }

  const fall = async () => {
    // Above every other flask for as long as it is over one of them, and deaf
    // to taps for just as long: a flask crossing the board passes over the ones
    // the player is reaching for, and must not catch a tap meant for them.
    flask.style.zIndex = '5'
    flask.style.pointerEvents = 'none'
    /*
     * The glass being filled rises too, above the board but below the flask
     * pouring into it. That is what keeps the falling elixir in front of the
     * flasks it crosses and still behind the one it lands in — on a board that
     * has wrapped onto two rows, those can be different flasks.
     */
    filling.style.zIndex = '3'

    travelling = animate(
      flask,
      { x: flight.x, y: flight.y, rotate: flight.rotate },
      { duration: LIFT_SECONDS / (speed * 2), ease: [0.32, 0.72, 0.35, 1] }
    )
    await travelling.finished
    if (cut) return

    land()
    showStream(flight.stream)
    await wait((STREAM_SECONDS + DRAIN_SECONDS) / (speed * 2))
    if (cut) return
    showStream(null)

    travelling = animate(
      flask,
      { x: 0, y: 0, rotate: 0 },
      { duration: RETURN_SECONDS / (speed * 2), ease: [0.32, 0.72, 0.35, 1] }
    )
    await travelling.finished
    if (cut) return

    settleBench()
  }

  return {
    finished: fall(),
    cutShort: () => {
      cut = true
      travelling?.stop()
      land()
      putBack()
    }
  }
}

function wait(seconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000))
}

/**
 * Where the flask has to travel to hang over the mouth it is filling, or null
 * when there is nothing to watch: a player who asked for less motion, or a
 * board that has not been laid out yet and has no positions to fly between.
 */
function flightBetween(
  boardEl: HTMLElement | null,
  source: HTMLElement,
  target: HTMLElement,
  poured: Flask
): Flight | null {
  const elixir = topElixir(poured)
  if (prefersReducedMotion()) return null
  if (boardEl === null || elixir === null) return null

  const boardAt = boardEl.getBoundingClientRect()
  const from = source.getBoundingClientRect()
  const onto = target.getBoundingClientRect()

  /*
   * The flask parks beside the one it is filling and tips its mouth over it, so
   * it leans towards the target and never away: coming from the left it turns
   * clockwise, and coming from the right it turns back the other way.
   */
  const fromTheRight = from.left > onto.left
  const lip = fromTheRight ? onto.right : onto.left

  return {
    x: lip - from.left - (fromTheRight ? 0 : from.width),
    y: onto.top - from.top - from.height / 2 - POURING_HEIGHT,
    rotate: fromTheRight ? -TILT_DEGREES : TILT_DEGREES,
    // The elixir falls from the lip hanging above the rim, not from the rim
    // itself, so the stream starts where the flask actually is.
    stream: {
      elixir,
      left: onto.left + onto.width / 2 - boardAt.left,
      top: onto.top - boardAt.top - POURING_HEIGHT,
      height: onto.height * 0.6 + POURING_HEIGHT
    }
  }
}

/*
 * Read at the moment a pour starts rather than subscribed to, which is the same
 * bargain the climbing score makes: the preference takes effect on the very
 * next pour, and nothing has to be torn down when it changes.
 */
function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
