import type Lenis from 'lenis'

let lenis: Lenis | null = null

export function registerLenis(instance: Lenis | null) {
  lenis = instance
}

/** Scroll to a section, through Lenis when active, natively otherwise. */
export function scrollToSection(id: string, reducedMotion: boolean) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis && !reducedMotion) {
    lenis.scrollTo(el, { offset: 0 })
  } else {
    el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' })
  }
}
