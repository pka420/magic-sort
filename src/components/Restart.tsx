import { useId } from 'react'
import { playSound } from '../audio/sounds'

interface RestartProps {
  readonly onRestart: () => void
  /** What throwing this level away costs, which climbs with what it pays. */
  readonly price: number
  /**
   * What the campaign has given up so far, so that the price of throwing
   * another level away is never a surprise.
   */
  readonly forfeited: number
  /** Whether that price is more than the player has left to pay it with. */
  readonly wouldEndTheRun: boolean
}

/**
 * Restarting throws away a level in progress and costs the campaign points,
 * so the line under the button names that price before anyone pays it.
 *
 * A player who cannot pay the price is pressing the end of their run,
 * which the line says outright: nothing here is bought on credit, so a level
 * thrown away unpaid is the last one of the run. That press lands silently —
 * the card that closes the run has a voice of its own.
 */
export function Restart({
  onRestart,
  price,
  forfeited,
  wouldEndTheRun
}: RestartProps) {
  const costId = useId()

  return (
    <div className='restart'>
      <button
        type='button'
        className='button'
        aria-describedby={costId}
        onClick={() => {
          if (!wouldEndTheRun) playSound('reset')
          onRestart()
        }}
      >
        Restart
      </button>

      <p
        className='restart__cost'
        id={costId}
        data-ends-the-run={wouldEndTheRun}
      >
        Restarting costs {price} points.
        {wouldEndTheRun &&
          ' That is more than you have: it would end your run.'}
        {forfeited > 0 && ` You have given up ${forfeited} points so far.`}
      </p>
    </div>
  )
}
