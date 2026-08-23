import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { LEVELS } from './domain/levels'
import { rememberCampaign } from './storage/savedRun'
import { lendStorage } from './test/storage'

const firstFlask = () => screen.getByRole('button', { name: /^Flask 1/ })

/** The first spare glass on the opening level, which anything can pour into. */
const spareFlask = () => screen.getByRole('button', { name: /^Flask 5/ })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('opens the game on the first level of the campaign', () => {
    render(<App />)

    expect(screen.getByText(/level 1 of/i)).toHaveTextContent(
      `Level 1 of ${LEVELS.length}`
    )
  })

  /*
   * A thousand for the first level and another thousand for every level after
   * it, which is what fifty levels add up to. The ladder is the reason to
   * press on rather than sort the easy levels over and over.
   */
  it('scores the whole campaign out of what its fifty levels pay', () => {
    render(<App />)

    expect(screen.getByLabelText('Total')).toHaveTextContent('0 / 1275000')
  })

  it('lays out every flask that first level holds', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /^Flask/ })).toHaveLength(
      LEVELS[0].board.length
    )
  })

  /*
   * The whole point of sealing a run: the player closes the tab mid-pour
   * and comes back to the board exactly as they left it, pours already spent
   * included. Proving it here proves the wiring, which is what the campaign
   * and the board cannot each prove on their own.
   */
  it('hands the player back the board they closed the tab on', async () => {
    lendStorage()
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(firstFlask())
    await user.click(spareFlask())
    await waitFor(() =>
      expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
    )
    const leftBehind = spareFlask().getAttribute('aria-label')
    unmount()

    render(<App />)

    expect(screen.getByLabelText('Pours')).toHaveTextContent('1')
    expect(spareFlask()).toHaveAttribute('aria-label', leftBehind)
  })

  /*
   * The end of a run, wired up. Nothing in the game is bought on credit, and
   * a player on the first level of a fresh run has banked nothing at all:
   * throwing that level away is the end of their run, and the card that says so
   * is the only thing left to reach.
   */
  it('closes down a run the player cannot pay their way out of', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Restart' }))

    await waitFor(() =>
      expect(screen.getByRole('alertdialog')).toHaveTextContent(
        'Laying this level out again costs 100 points, which is more than you have.'
      )
    )
  })

  /*
   * The way out of an ended run, wired up end to end: the card hands back a
   * fresh board and an empty ledger, and the save that carried the old run in
   * is gone rather than waiting for the next reload.
   */
  it('hands the player a clean board and an empty ledger once the run is over', async () => {
    lendStorage()
    rememberCampaign({ reached: 4, earned: 300, forfeited: 0, rebirths: 0 })
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/level 5 of/i)).toBeInTheDocument()

    // A restart on this level costs 500 and the player banks only 300:
    // nothing here is bought on credit, so the press ends their run.
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Restart' }))
    await user.click(screen.getByRole('button', { name: 'Begin a new run' }))

    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    )
    // Awaited because the total counts back down rather than vanishing.
    await waitFor(() =>
      expect(screen.getByLabelText('Total')).toHaveTextContent('0 / 1275000')
    )
    expect(screen.getByText(/level 1 of/i)).toBeInTheDocument()
  })
})
