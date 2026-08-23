import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useState
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { ReactNode } from 'react'

interface MenuProps {
  /** The tools and settings that live behind the burger until asked for. */
  readonly children: ReactNode
}

/*
 * The drawer hands the tools inside it the way to close it behind themselves:
 * a tool spent is a tool with nothing left to hold open. Outside a drawer it
 * is a no-op, so a tool keeps working wherever it is mounted.
 */
const MenuCloseContext = createContext<() => void>(() => {})

/** Closes the drawer this component sits in, if it sits in one. */
export function useMenuClose() {
  return useContext(MenuCloseContext)
}

/**
 * The game's drawer: the speed and the restart are tools for a moment rather
 * than for the whole session, so they hide behind a burger on the edge of the
 * screen and stay out of the board's way.
 *
 * Escape closes it, the way every dialog on this screen does — and so does
 * using either tool, because neither is needed twice in a row.
 */
export function Menu({ children }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const panelId = useId()
  const close = useCallback(() => setIsOpen(false), [])

  useEffect(() => {
    if (!isOpen) return

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isOpen, close])

  return (
    <>
      <button
        type='button'
        className='menu-toggle'
        aria-label='Menu'
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className='menu-toggle__bars' aria-hidden='true' />
        <span className='menu-toggle__label'>Menu</span>
      </button>

      {/* Fading rather than sliding: the drawer hangs from its anchor under
          the toggle, and a slide would drag it across the board. */}
      <AnimatePresence>
        {isOpen && (
          <MenuCloseContext.Provider value={close}>
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
          </MenuCloseContext.Provider>
        )}
      </AnimatePresence>
    </>
  )
}
