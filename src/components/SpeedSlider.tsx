interface SpeedSliderProps {
  readonly speed: number
  readonly onSpeedChange: (speed: number) => void
}

export function SpeedSlider({ speed, onSpeedChange }: SpeedSliderProps) {
  return (
    <label className='speed-control'>
      <span className='speed-control__label'>Speed</span>
      <input
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
