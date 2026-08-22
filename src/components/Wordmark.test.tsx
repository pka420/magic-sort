import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './Wordmark'

describe('Wordmark', () => {
  it('renders the game title', () => {
    render(<Wordmark />)

    expect(
      screen.getByRole('heading', { name: 'Magic Sort' })
    ).toBeInTheDocument()
  })

  it('displays the text "Magic Sort"', () => {
    render(<Wordmark />)

    expect(screen.getByText('Magic Sort')).toBeInTheDocument()
  })
})
