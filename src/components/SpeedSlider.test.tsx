import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SpeedSlider } from './SpeedSlider'

describe('SpeedSlider', () => {
  it('renders with the current speed value', () => {
    render(<SpeedSlider speed={1} onSpeedChange={vi.fn()} />)

    expect(screen.getByLabelText('Animation speed')).toHaveValue('1')
    expect(screen.getByText('1.0x')).toBeInTheDocument()
  })

  it('calls onSpeedChange when the slider is moved', () => {
    const onSpeedChange = vi.fn()
    render(<SpeedSlider speed={1} onSpeedChange={onSpeedChange} />)

    fireEvent.change(screen.getByLabelText('Animation speed'), {
      target: { value: '2' }
    })

    expect(onSpeedChange).toHaveBeenCalledWith(2)
  })

  it('displays the speed value with one decimal place', () => {
    render(<SpeedSlider speed={2.5} onSpeedChange={vi.fn()} />)

    expect(screen.getByText('2.5x')).toBeInTheDocument()
  })

  it('has a range from 0.5 to 3', () => {
    render(<SpeedSlider speed={1} onSpeedChange={vi.fn()} />)
    const slider = screen.getByLabelText('Animation speed')

    expect(slider).toHaveAttribute('min', '0.5')
    expect(slider).toHaveAttribute('max', '3')
    expect(slider).toHaveAttribute('step', '0.1')
  })
})
