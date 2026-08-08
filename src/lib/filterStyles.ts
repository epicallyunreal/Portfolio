/**
 * Cross-filter card treatment. The old approach faded non-matches to near
 * invisibility, which made matches hard to spot in a stacked column — now the
 * match is what stands out (accent ring + glow) and non-matches stay readable.
 */
export function filterCardClasses(selected: string | null, matches: boolean): string {
  if (!selected) return 'border-line'
  return matches
    ? 'border-accent/70 ring-2 ring-accent/50 shadow-glow'
    : 'border-line opacity-60 saturate-50'
}
