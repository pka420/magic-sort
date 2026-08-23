interface UndoProps {
  readonly onUndo: () => void
  /** Whether there is a pour on the board left to take back. */
  readonly canUndo: boolean
}

/**
 * The last pour, taken back. It stands beside the board rather than inside
 * the drawer, because it answers a slip of the finger — and a slip happens
 * mid-pour, not inside a menu.
 *
 * Icon only: the curl of the arrow says it, so the accessible name is what
 * carries the word.
 */
export function Undo({ onUndo, canUndo }: UndoProps) {
  return (
    <button
      type='button'
      className='undo'
      aria-label='Undo'
      disabled={!canUndo}
      onClick={onUndo}
    >
      <svg
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
      >
        <path d='M1 4v6h6' />
        <path d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10' />
      </svg>
    </button>
  )
}
