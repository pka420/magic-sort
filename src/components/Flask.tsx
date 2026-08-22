import { useEffect } from 'react'
import { AnimatePresence, motion, useAnimate } from 'motion/react'
import { isComplete } from '../domain/flask'
import { celebrateFlask } from '../effects/confetti'
import type { CSSProperties } from 'react'
import type { Elixir } from '../domain/flask'

/** The layers this flask holds, bottom-most first. */
type FlaskContents = readonly Elixir[]

/**
 * A shape for every elixir, for the players no palette can serve. Eight colours
 * cannot all be kept apart by colour alone: the closest pair anyone sees on
 * this bench is ΔE 5.9, and the best palette that still lets each elixir answer
 * to its own name only reaches 11.9 — while a player with no colour vision at
 * all is left with pairs at almost the same lightness. A silhouette has none of
 * those failure modes.
 */
/**
 * How long poured elixir takes to settle. The confetti and the wobble wait for
 * it, and the golden seal is held back by the same delay in CSS: celebrating
 * while the last layer is still on its way is what made the pour look late.
 */
const SETTLE_MS = 190

interface FlaskProps {
  /** What the player sees on the label: flasks are numbered from one. */
  readonly position: number
  readonly contents: FlaskContents
  /** Layers this flask's own glass holds when full, which sets how tall it is. */
  readonly capacity: number
  /** Whether each layer carries its elixir's sigil as well as its colour. */
  readonly isSelected: boolean
  /** Tap sequence of the pour this flask just refused, or null. */
  readonly refusedAt: number | null
  readonly onTap: () => void
  /** Animation speed multiplier: 0.5x to 3x. */
  readonly speed: number
}

export function Flask({
  position,
  contents,
  capacity,
  isSelected,
  refusedAt,
  onTap,
  speed
}: FlaskProps) {
  const [scope, animate] = useAnimate()
  const [glassScope, animateGlass] = useAnimate()
  const sealed = isComplete({ contents, capacity })
  const layerHeight = `${100 / capacity}%`

  useEffect(() => {
    if (refusedAt === null) return
    animate(
      scope.current,
      { x: [0, -9, 9, -6, 6, 0] },
      { duration: 0.36 / (speed * 2), ease: 'easeInOut' }
    )
  }, [refusedAt, animate, scope, speed])

  useEffect(() => {
    if (!sealed) return

    const settling = setTimeout(
      () => {
        celebrateFlask(scope.current)
        animateGlass(
          glassScope.current,
          { rotate: [0, -7, 6, -4, 2, 0], scale: [1, 1.07, 1.02, 1] },
          { duration: 0.7 / (speed * 2), ease: 'easeOut' }
        )
      },
      SETTLE_MS / (speed * 2)
    )

    return () => clearTimeout(settling)
  }, [sealed, animateGlass, glassScope, scope, speed])

  return (
    <motion.button
      ref={scope}
      type='button'
      className='flask'
      /* The bottle grows with its own glass, so a layer is the same thickness
         in every one of them: taller glass reads as taller glass rather than as
         thinner elixir. The cast is what a custom property costs in TSX. */
      style={{ '--layers': capacity } as CSSProperties}
      /* Girth and silhouette are the stylesheet's business, but which of the
         three shapes to draw is this flask's own size. */
      data-glass={capacity}
      data-selected={isSelected}
      data-sealed={sealed}
      aria-pressed={isSelected}
      aria-label={describeFlask(position, contents, capacity)}
      onClick={onTap}
      animate={{ y: isSelected ? -22 : 0 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 26 }}
    >
      <span ref={glassScope} className='flask__bottle'>
        <span className='flask__body'>
          <AnimatePresence initial={false}>
            {contents.map((elixir, layer) => (
              <motion.span
                key={`${layer}-${elixir}`}
                className='flask__layer'
                data-elixir={elixir}
                initial={{ height: 0 }}
                animate={{ height: layerHeight }}
                exit={{ height: 0 }}
                transition={{
                  duration: 0.19 / speed,
                  ease: [0.3, 0.9, 0.4, 1]
                }}
              >
                {/* Hidden from screen readers: the flask's own label already
                    names every elixir it holds, in order. */}
              </motion.span>
            ))}
          </AnimatePresence>
        </span>
      </span>
    </motion.button>
  )
}

/*
 * The size of the glass is part of what a flask is once the benches mix them:
 * an elixir can only ever be sealed in a flask its layers exactly fill, so a
 * player who cannot see the squat vial next to the tall one still has to know
 * which of the two they are about to pour into.
 */
function describeFlask(
  position: number,
  contents: FlaskContents,
  capacity: number
): string {
  const glass = `${capacity}-layer flask`

  if (contents.length === 0) return `Flask ${position}, an empty ${glass}`
  return `Flask ${position}, a ${glass} holding ${contents.join(', ')} from bottom to top`
}
