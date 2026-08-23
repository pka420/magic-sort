import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GameOver } from './GameOver'
import { playSound, warmSound } from '../audio/sounds'

// Audio is a real boundary, and the sound of a run ending is part of what is
// being asked for here.
vi.mock('../audio/sounds', () => ({
  playSound: vi.fn(),
  stopSound: vi.fn(),
  warmSound: vi.fn()
}))

const showCard = (onBeginAgain = vi.fn()) => {
  render(
    <GameOver
      ending={{ kind: 'stuck', price: 100 }}
      onBeginAgain={onBeginAgain}
    />
  )
  return onBeginAgain
}

const beginAgain = () => screen.getByRole('button', { name: 'Begin a new run' })

beforeEach(() => {
  vi.mocked(playSound).mockClear()
  vi.mocked(warmSound).mockClear()
})

describe('GameOver', () => {
  /*
   * The ending nobody pressed for: the bench has run dry of pours and laying it
   * out again costs more than the apprentice has. Naming the price is what
   * stops the card reading as a bug.
   */
  it('tells the apprentice stuck on a dry bench what the way out would cost', () => {
    render(
      <GameOver ending={{ kind: 'stuck', price: 500 }} onBeginAgain={vi.fn()} />
    )

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'There is no pour left on this bench, and you cannot pay the 500 points it costs to lay it out again.'
    )
  })

  it('tells the apprentice who threw a bench away what they could not pay for it', () => {
    render(
      <GameOver
        ending={{ kind: 'restart', price: 100 }}
        onBeginAgain={vi.fn()}
      />
    )

    expect(screen.getByRole('alertdialog')).toHaveTextContent(
      'Laying this bench out again costs 100 points, which is more than you have.'
    )
  })

  it('marks the end of the run with a sound of its own', () => {
    showCard()

    expect(vi.mocked(playSound).mock.calls).toEqual([['defeat']])
  })

  /*
   * The next run opens on a recorded track that Howler only fetches when it is
   * first played, so it is asked for while the apprentice is still reading
   * the card.
   */
  it('fetches the next run’s sound while the apprentice takes the news in', () => {
    showCard()

    expect(vi.mocked(warmSound).mock.calls).toEqual([['revive']])
  })

  it('puts the way back into the atelier under the apprentice’s finger', () => {
    showCard()

    expect(beginAgain()).toHaveFocus()
  })

  it('opens a new run when the apprentice asks for one', async () => {
    const user = userEvent.setup()
    const onBeginAgain = showCard()

    await user.click(beginAgain())

    expect(onBeginAgain).toHaveBeenCalledTimes(1)
  })

  it('sounds the new run opening', async () => {
    const user = userEvent.setup()
    showCard()

    await user.click(beginAgain())

    expect(vi.mocked(playSound).mock.calls).toEqual([['defeat'], ['revive']])
  })
})
