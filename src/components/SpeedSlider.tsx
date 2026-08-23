import { useEffect, useRef } from 'react'
import { useMenuClose } from './Menu'

interface SpeedSliderProps {
  readonly speed: number
  readonly onSpeedChange: (speed: number) => void
}

export function SpeedSlider({ speed, onSpeedChange }: SpeedSliderProps) {
  const closeMenu = useMenuClose()
  const sliderRef = useRef<HTMLInputElement>(null)

  /*
   * The drawer folds away once a speed is settled on, not while the slider
   * is still being dragged: React's change rides every tick of the input
   * event, which would pull the drawer out from under the player's hand
   * mid-drag. The browser's own change waits until the value commits.
   */
  useEffect(() => {
    const slider = sliderRef.current
    if (!slider) return

    slider.addEventListener('change', closeMenu)
    return () => slider.removeEventListener('change', closeMenu)
  }, [closeMenu])

  return (
    <label className='speed-control'>
      <span className='speed-control__label'>Speed</span>
      <input
        ref={sliderRef}
        type='range'
        className='speed-control__slider'
        min={0.5}
        max={3}
        step={0.1}
        value={speed}
        onChange={(event) => onSpeedChange(Number(event.target.value))}
        aria-label='Animation speed'
      />
      <span className='speed-control__value'>{speed.toFixed(1)}x</span>
    </label>
  )
}
