import { useEffect, useState } from 'react'

/**
 * Scroll-spy: reports the section currently dominating the viewport so the
 * topology nav mirrors scroll position.
 *
 * Sections are lazy-loaded, so their elements don't all exist when this first
 * runs — a MutationObserver keeps re-scanning until every id is observed.
 */
export function useActiveSection(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')

  useEffect(() => {
    const visible = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio)
          else visible.delete(entry.target.id)
        }
        let best = ''
        let bestRatio = 0
        for (const [id, ratio] of visible) {
          if (ratio > bestRatio) {
            best = id
            bestRatio = ratio
          }
        }
        if (best) setActive(best)
      },
      { rootMargin: '-15% 0px -40% 0px', threshold: [0, 0.05, 0.15, 0.3, 0.5, 0.75, 1] },
    )

    const observed = new Set<string>()
    const scan = () => {
      for (const id of ids) {
        if (observed.has(id)) continue
        const el = document.getElementById(id)
        if (el) {
          io.observe(el)
          observed.add(id)
        }
      }
      if (observed.size === ids.length) mo.disconnect()
    }
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    scan()

    return () => {
      mo.disconnect()
      io.disconnect()
    }
  }, [ids])

  return active
}
