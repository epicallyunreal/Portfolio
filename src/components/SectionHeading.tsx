interface SectionHeadingProps {
  id: string
  index: string
  title: string
  hint?: string
}

/**
 * Pins to the top of the viewport for as long as its section is in view, so
 * the current section is always named — the item navigation beside it sticks
 * just below (top-24).
 *
 * Height is deliberately constant: a sticky box still occupies its place in
 * flow, so growing or shrinking it on stick would shove the section content
 * and could oscillate. The hint sits outside the sticky box and scrolls away.
 *
 * No <Reveal> wrapper here — a transformed ancestor becomes the sticky
 * element's containing block and would pin it to its own box, i.e. not at all.
 */
export function SectionHeading({ id, index, title, hint }: SectionHeadingProps) {
  return (
    <>
      {/* Opaque, not backdrop-blurred: seven full-width blur layers cost ~0.9s
          of LCP (measured), and against the flat background a solid fill is
          indistinguishable. */}
      <div className="section-heading-bar sticky top-0 z-30 -mx-6 mb-6 px-6 py-4 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16">
        <div className="flex items-baseline gap-3">
          <span aria-hidden="true" className="font-mono text-sm text-accent">
            {index} /
          </span>
          <h2 id={id} className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            {title}
          </h2>
        </div>
        <div
          aria-hidden="true"
          className="mt-3 h-px w-full bg-gradient-to-r from-accent via-accent/30 to-transparent"
        />
      </div>
      {hint ? <p className="mb-8 max-w-xl text-sm text-muted">{hint}</p> : null}
    </>
  )
}
