import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { App } from './App'
import { LEVELS } from './domain/levels'
import { rememberCampaign } from './storage/savedRun'
import { lendStorage } from './test/storage'

const firstFlask = () => screen.getByRole('button', { name: /^Flask 1/ })

/** The first spare glass on the opening bench, which anything can pour into. */
const spareFlask = () => screen.getByRole('button', { name: /^Flask 5/ })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('App', () => {
  it('opens the atelier on the first bench of the campaign', () => {
    render(<App />)

    expect(screen.getByText(/level 1 of/i)).toHaveTextContent(
      `Level 1 of ${LEVELS.length}`
    )
  })

  /*
   * A thousand for the first bench and another thousand for every bench after
   * it, which is what fifty benches add up to. The ladder is the reason to
   * press on rather than sort the easy benches over and over.
   */
  it('scores the whole atelier out of what its fifty benches pay', () => {
    render(<App />)

    expect(screen.getByLabelText('Total')).toHaveTextContent('0 / 1275000')
  })

  it('lays out every flask that first bench holds', () => {
    render(<App />)

    expect(screen.getAllByRole('button', { name: /^Flask/ })).toHaveLength(
      LEVELS[0].board.length
    )
  })

  /*
   * The whole point of sealing a run: the apprentice closes the tab mid-pour
   * and comes back to the bench exactly as they left it, pours already spent
   * included. Proving it here proves the wiring, which is what the campaign
   * and the bench cannot each prove on their own.
   */
  it('hands the apprentice back the bench they closed the tab on', async () => {
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
   * The end of a run, wired up. Nothing in the atelier is bought on credit, and
   * an apprentice on the first bench of a fresh run has banked nothing at all:
   * throwing that bench away is the end of their run, and the card that says so
   * is the only thing left to reach.
   */
  it('closes down a run the apprentice cannot pay their way out of', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.pointer({
      keys: '[MouseLeft>]',
      target: screen.getByRole('button', { name: 'Hold to restart' })
    })

    await waitFor(
      () =>
        expect(screen.getByRole('alertdialog')).toHaveTextContent(
          'Laying this bench out again costs 100 points, which is more than you have.'
        ),
      { timeout: 3000 }
    )
  })

  /*
   * The walk back to the first bench costs the whole atelier behind it, which
   * deep into a run is more than the apprentice has: it is the way out of a run
   * as well as the way back. What is being proved here runs from the dialog all
   * the way down to the save being swept, and no lower layer can prove that on
   * its own.
   */
  it('hands the apprentice a clean bench and an empty ledger once the run is over', async () => {
    lendStorage()
    rememberCampaign({ reached: 4, earned: 9000, forfeited: 0, rebirths: 0 })
    const user = userEvent.setup()
    render(<App />)
    expect(screen.getByText(/level 5 of/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Start over' }))
    await user.click(screen.getByRole('button', { name: 'Yes, end my run' }))
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
