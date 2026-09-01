import { useCallback, useEffect, useRef } from 'react'
import { useMediaQuery } from './useMediaQuery'
import { useReducedMotion } from './useReducedMotion'

/**
 * Pointer-reactive 3D tilt.
 *
 * Writes CSS custom properties straight to the node instead of going through
 * React state. A mousemove handler that calls setState re-renders the card on
 * every frame of every hover; setting a property re-runs only style and paint,
 * and the browser coalesces those into the frame it was already producing.
 *
 * Batched into requestAnimationFrame because pointermove can fire faster than
 * the display refreshes, and only the last position in a frame is visible.
 *
 * Disabled outright without a fine pointer or under reduced motion. Touch never
 * gets a hover state to be stuck in, and nothing here carries meaning — the
 * card reads identically with all of it off.
 */
export function usePointerTilt<T extends HTMLElement>(maxDeg = 6) {
  const reduced = useReducedMotion()
  const finePointer = useMediaQuery('(pointer: fine)')
  const enabled = finePointer && !reduced

  const ref = useRef<T>(null)
  const frame = useRef(0)
  const next = useRef({ rx: 0, ry: 0 })

  const flush = useCallback(() => {
    frame.current = 0
    const el = ref.current
    if (!el) return
    const { rx, ry } = next.current
    el.style.setProperty('--tilt-x', `${rx.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${ry.toFixed(2)}deg`)
  }, [])

  const schedule = useCallback(() => {
    if (frame.current) return
    frame.current = requestAnimationFrame(flush)
  }, [flush])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<T>) => {
      if (!enabled || !ref.current) return
      const r = ref.current.getBoundingClientRect()
      const px = (e.clientX - r.left) / r.width
      const py = (e.clientY - r.top) / r.height
      next.current = {
        // Tilt away from the cursor: pushing the near edge down is what reads
        // as a physical object rather than a picture being rotated.
        rx: -(py - 0.5) * maxDeg,
        ry: (px - 0.5) * maxDeg,
      }
      schedule()
    },
    [enabled, maxDeg, schedule],
  )

  const onPointerLeave = useCallback(() => {
    if (!ref.current) return
    next.current = { rx: 0, ry: 0 }
    schedule()
  }, [schedule])

  return {
    ref,
    /** Spread onto the element that should tilt. */
    tiltProps: enabled ? { onPointerMove, onPointerLeave } : {},
    enabled,
  }
}
