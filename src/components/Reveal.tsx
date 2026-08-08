import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useMediaQuery, DESKTOP_QUERY } from '../hooks/useMediaQuery'
import { DUR_ENTRANCE, EASE_ENTRANCE } from '../lib/motion'

interface RevealProps {
  children: ReactNode
  delay?: number
  className?: string
  /** Entrance direction — cards slide in from the side they sit on. */
  from?: 'up' | 'left' | 'right'
}

const OFFSETS = {
  up: { y: 24, x: 0 },
  left: { y: 0, x: -36 },
  right: { y: 0, x: 36 },
} as const

/** Fade + slide on first entry into the viewport. Static under reduced motion. */
export function Reveal({ children, delay = 0, className, from = 'up' }: RevealProps) {
  const reduced = useReducedMotion()
  const desktop = useMediaQuery(DESKTOP_QUERY)

  if (reduced) return <div className={className}>{children}</div>

  // A horizontal start offset widens the document until the element animates
  // in, which on a phone means a real horizontal scrollbar for anything still
  // below the fold. Narrow screens get the vertical entrance instead — the
  // side-aware slide only reads as intentional next to the two-column layouts
  // it was designed for, which are desktop-only anyway.
  const offset = OFFSETS[desktop ? from : 'up']

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: DUR_ENTRANCE, ease: EASE_ENTRANCE, delay }}
    >
      {children}
    </motion.div>
  )
}
