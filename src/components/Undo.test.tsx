import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Undo } from './Undo'

const undoButton = () => screen.getByRole('button', { name: 'Undo' })

interface Press {
  readonly onUndo?: () => void
  readonly canUndo?: boolean
}

/** Renders the button and hands back the undo it is wired to. */
const showButton = (press: Press = {}) => {
  const onUndo = press.onUndo ?? vi.fn()
  render(<Undo onUndo={onUndo} canUndo={press.canUndo ?? true} />)
  return onUndo
}

describe('Undo', () => {
  it('takes the last pour back the moment it is clicked', async () => {
    const user = userEvent.setup()
    const undo = showButton()

    await user.click(undoButton())

    expect(undo).toHaveBeenCalledTimes(1)
  })

  /* The curl is the only label on the button, so the word has to reach
     screen readers some other way. */
  it('is named Undo without a word of visible text', () => {
    showButton()

    expect(undoButton()).toHaveAccessibleName('Undo')
    expect(undoButton()).toHaveTextContent('')
  })

  /* A button with nothing behind it must not pretend otherwise. */
  it('stays out of reach until there is a pour to take back', () => {
    showButton({ canUndo: false })

    expect(undoButton()).toBeDisabled()
  })
})
