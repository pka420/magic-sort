import { useEffect, useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

interface MenuProps {
  /** The tools and settings that live behind the burger until asked for. */
  readonly children: ReactNode
}

/**
 * The game's drawer: the speed and the restart are tools for a moment rather
 * than for the whole session, so they hide behind a burger on the edge of the
 * screen and stay out of the board's way.
 *
 * Escape closes it, the way every dialog on this screen does.
 */
export function Menu({ children }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()

  useEffect(() => {
    if (!isOpen) return

    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [isOpen])

  return (
    <>
      <button
        type='button'
        className='menu-toggle'
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className='menu-toggle__bars' aria-hidden='true' />
        Menu
      </button>

      {/* Fading rather than sliding: the panel is centred with a transform of
          its own, which an animated x would overwrite mid-flight. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className='menu-panel'
            id={panelId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
