/**
 * The site's palette, read from the stylesheet that defines it.
 *
 * The theme lives in one place — the `--c-*` block in src/styles/index.css —
 * and the browser resolves it through CSS variables. The asset builders here
 * are Node: they rasterise an SVG and an Open Graph card with no CSS engine
 * behind them, so they cannot resolve `var()` and would otherwise need their
 * own copy of the colours. A second copy is a copy that drifts, and the first
 * sign of drift would be a favicon that no longer matches the site.
 *
 * Parsing the stylesheet keeps one source of truth without asking the build to
 * carry a CSS engine.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CSS = join(dirname(fileURLToPath(import.meta.url)), '../../src/styles/index.css')

/** Channel triplets ("18 22 42") keyed by name, as authored. */
export function paletteChannels() {
  const css = readFileSync(CSS, 'utf8')
  const out = {}
  for (const [, name, value] of css.matchAll(/--c-([a-z0-9]+):\s*([\d\s]+);/g)) {
    out[name] = value.trim()
  }
  if (!out.bg || !out.accent) {
    throw new Error(`No --c-* palette found in ${CSS}`)
  }
  return out
}

/** The same palette as #rrggbb, which is what SVG and canvas want. */
export function palette() {
  return Object.fromEntries(
    Object.entries(paletteChannels()).map(([k, v]) => [
      k,
      '#' +
        v
          .split(/\s+/)
          .map((n) => Number(n).toString(16).padStart(2, '0'))
          .join(''),
    ]),
  )
}
