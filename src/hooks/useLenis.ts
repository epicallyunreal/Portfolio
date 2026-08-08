import { useEffect } from 'react'
import Lenis from 'lenis'
import { registerLenis } from '../lib/scroll'

/** Smooth scrolling site-wide; disabled entirely under reduced motion. */
export function useLenis(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      registerLenis(null)
      return
    }
    const lenis = new Lenis({ duration: 1.05 })
    registerLenis(lenis)
    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    })
    return () => {
      cancelAnimationFrame(frame)
      registerLenis(null)
      lenis.destroy()
    }
  }, [enabled])
}
