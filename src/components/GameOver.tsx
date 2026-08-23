import { useEffect, useId } from 'react'
import { motion } from 'motion/react'
import { playSound, warmSound } from '../audio/sounds'
import type { RunsEnd } from '../domain/runsEnd'

interface GameOverProps {
  /** What ended the run, which is what this card is here to explain. */
  readonly ending: RunsEnd
  /** Opens a run from nothing, which is all there is left to do. */
  readonly onBeginAgain: () => void
}

/**
 * The end of a run, whichever way it came: a level with no pour left that the
 * player cannot afford to lay out again, or a restart pressed without the
 * points to pay for it. It is hand rolled rather than a <dialog>, because
 * jsdom has no showModal, and this is behaviour the tests have to drive.
 */
export function GameOver({ ending, onBeginAgain }: GameOverProps) {
  const titleId = useId()
  const debtId = useId()

  useEffect(() => {
    playSound('defeat')
    // The card is read before it is answered, and that is exactly long enough
    // to fetch the recorded track the answer plays.
    warmSound('revive')
  }, [])

  const beginAgain = () => {
    playSound('revive')
    onBeginAgain()
  }

  return (
    <motion.div
      className='veil'
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className='confirm confirm--ruin'
        role='alertdialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={debtId}
        initial={{ scale: 0.92, y: 18 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      >
        <h2 className='confirm__title' id={titleId}>
          Game over
        </h2>
        <p className='confirm__detail' id={debtId}>
          {whatEndedIt(ending)} The board has been cleared.
        </p>

        <div className='confirm__actions'>
          <button
            type='button'
            className='button button--primary button--wide'
            autoFocus
            onClick={beginAgain}
          >
            Begin a new run
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function whatEndedIt(ending: RunsEnd): string {
  switch (ending.kind) {
    case 'stuck':
      return `There is no pour left on this level, and you cannot pay the ${ending.price} points it costs to lay it out again.`
    case 'restart':
      return `Laying this level out again costs ${ending.price} points, which is more than you have.`
  }
}
