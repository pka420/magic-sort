import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Restart } from './Restart'
import { playSound } from '../audio/sounds'

// Audio is a real boundary: there is no speaker in a test run. It is also part
// of what is under test here — a thrown-away level is poured back out loudly.
vi.mock('../audio/sounds', () => ({
  playSound: vi.fn(),
  stopSound: vi.fn(),
  warmSound: vi.fn()
}))

const restartButton = () => screen.getByRole('button', { name: 'Restart' })

interface Press {
  readonly onRestart?: () => void
  readonly price?: number
  readonly forfeited?: number
  readonly wouldEndTheRun?: boolean
}

/** Renders the button and hands back the restart it is wired to. */
const showButton = (press: Press = {}) => {
  const onRestart = press.onRestart ?? vi.fn()
  render(
    <Restart
      onRestart={onRestart}
      price={press.price ?? 100}
      forfeited={press.forfeited ?? 0}
      wouldEndTheRun={press.wouldEndTheRun ?? false}
    />
  )
  return onRestart
}

beforeEach(() => {
  vi.mocked(playSound).mockClear()
})

describe('Restart', () => {
  it('throws the level away the moment it is clicked', async () => {
    const user = userEvent.setup()
    const restart = showButton()

    await user.click(restartButton())

    expect(restart).toHaveBeenCalledTimes(1)
  })

  it('pours the level back out audibly', async () => {
    const user = userEvent.setup()
    showButton()

    await user.click(restartButton())

    expect(vi.mocked(playSound).mock.calls).toEqual([['reset']])
  })

  /* A press nobody comes back from must not sound like a level being poured
     back out: the card that closes the run has a voice of its own. */
  it('lands silently when the click is the end of the run', async () => {
    const user = userEvent.setup()
    const restart = showButton({ wouldEndTheRun: true })

    await user.click(restartButton())

    expect(vi.mocked(playSound)).not.toHaveBeenCalled()
    expect(restart).toHaveBeenCalledTimes(1)
  })

  it('says what a restart will cost before anyone presses it', () => {
    showButton()

    expect(restartButton()).toHaveAccessibleDescription(
      'Restarting costs 100 points.'
    )
  })

  /* A later level pays more, so throwing one away costs more. */
  it('names the price of the level actually being thrown away', () => {
    showButton({ price: 2600 })

    expect(restartButton()).toHaveAccessibleDescription(
      'Restarting costs 2600 points.'
    )
  })

  /*
   * What has been given up, not what restarts have given up: naming restarts
   * alone would have this line telling a player who has never restarted
   * that restarts cost them a thousand points.
   */
  it('owns up to what the campaign has given up so far', () => {
    showButton({ forfeited: 200 })

    expect(restartButton()).toHaveAccessibleDescription(
      'Restarting costs 100 points. You have given up 200 points so far.'
    )
  })

  /*
   * A restart is paid for out of banked points, and on the first level of a
   * fresh run there are none: pressing this is the end of the run. Saying so
   * before it is pressed is what makes it a decision rather than an ambush.
   */
  it('warns the player whose restart would end their run', () => {
    showButton({ wouldEndTheRun: true })

    expect(restartButton()).toHaveAccessibleDescription(
      'Restarting costs 100 points. That is more than you have: it would end your run.'
    )
  })
})
