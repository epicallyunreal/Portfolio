/**
 * Initials for skills that have no logo of their own — concepts like "OOP" or
 * "System design" have no brand mark, so they get a generated badge instead of
 * a generic placeholder that looks identical for every one of them.
 *
 *   OOP                      → OOP     (acronyms stay whole)
 *   SQL query optimization   → SQL     (leading acronym wins)
 *   System design            → SD      (initials of each word)
 *   Data structures & algorithms → DSA
 *   Agile                    → A       (single long word)
 */
export function initials(label: string): string {
  const words = label
    .replace(/[()]/g, ' ')
    .split(/[\s&,]+/)
    .filter(Boolean)
  if (words.length === 0) return '?'

  // A leading acronym is more recognisable than the initials of the phrase.
  const acronym = /^[A-Z0-9][A-Z0-9/.+#-]{1,4}$/
  if (acronym.test(words[0])) return words[0]

  if (words.length > 1) {
    return words
      .slice(0, 3)
      .map((word) => word[0])
      .join('')
      .toUpperCase()
  }

  const word = words[0]
  return (word.length <= 4 ? word : word[0]).toUpperCase()
}

/* ------------------------------------------------------------------ colour */

const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))

const parse = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

const luminance = ([r, g, b]: [number, number, number]) =>
  0.2126 * channel(r / 255) + 0.7152 * channel(g / 255) + 0.0722 * channel(b / 255)

const contrast = (rgb: [number, number, number], bg: number) => {
  const l = luminance(rgb)
  return (Math.max(l, bg) + 0.05) / (Math.min(l, bg) + 0.05)
}

/**
 * Brand colours are chosen for logos, not for small text on a dark panel —
 * several (PostgreSQL blue, violet) land under 4.5:1 as monogram text. Lighten
 * toward white until they clear it, so any colour set in the editor stays
 * readable. Only the glyph is adjusted; the tint and border keep the original.
 */
export function readableOnDark(hex: string, background = '#101820', target = 4.5): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex
  const bg = luminance(parse(background))
  let rgb = parse(hex)
  for (let i = 0; i < 24 && contrast(rgb, bg) < target; i++) {
    rgb = rgb.map((v) => Math.round(v + (255 - v) * 0.1)) as [number, number, number]
  }
  return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}
