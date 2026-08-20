import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { lab } from '../lib/lab'
import { orderTech } from '../lib/data'
import { sectionItems } from '../lib/sections'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { EASE_ENTRANCE } from '../lib/motion'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { TechLogo } from '../components/TechLogo'
import type { LabItem } from '../lib/types'

/**
 * The Lab renders from lab.json, not resume.json — see src/lib/lab.ts for why.
 *
 * Every other section is a vertical list of cards competing for the reader's
 * scroll. This one is a deck: one entry at a time, given the whole width,
 * leading with why it was built before what it does. The résumé sections have
 * to earn their space; these don't, so they get room to explain themselves.
 *
 * Semantically it is a tab set, which is what "pick one, see one" already
 * means to a screen reader — the deck nav is the tablist, each entry a tab,
 * the card its panel, with the arrow-key behaviour that pattern implies.
 */

const STATUS: Record<NonNullable<LabItem['status']>, { label: string; className: string }> = {
  live: { label: 'live', className: 'border-accent2/50 text-accent2' },
  wip: { label: 'in progress', className: 'border-amber-400/50 text-amber-300' },
  archived: { label: 'archived', className: 'border-line text-faint' },
}

const LINK_CLASS =
  'whitespace-nowrap font-mono text-sm text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function ArrowButton({
  direction,
  onClick,
  disabled,
}: {
  direction: 'prev' | 'next'
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'prev' ? 'Previous entry' : 'Next entry'}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel font-mono text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <span aria-hidden="true">{direction === 'prev' ? '←' : '→'}</span>
    </button>
  )
}

type Facet = { key: string; label: string; body: React.ReactNode }

/**
 * Landscape by construction: the shot fills one half at the card's full
 * height, the prose the other. There is more to say about each entry than fits
 * in that shape, so the text side switches between facets instead of stacking
 * them — the card keeps its proportions and the section stays a section
 * rather than turning into a page.
 */
function LabCard({ item }: { item: LabItem }) {
  const status = STATUS[item.status ?? 'live']
  const reduced = useReducedMotion()

  const facets: Facet[] = [
    {
      key: 'why',
      label: 'Why it exists',
      body: <p className="max-w-[68ch] text-[15px] leading-relaxed text-muted">{item.why}</p>,
    },
    ...(item.features && item.features.length > 0
      ? [
          {
            key: 'does',
            label: 'What it does',
            body: (
              <ul className="max-w-[68ch] space-y-2.5">
                {item.features.map((feature, i) => (
                  <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-muted">
                    <span
                      aria-hidden="true"
                      className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
    ...(item.notes && item.notes.length > 0
      ? [
          {
            key: 'notes',
            label: 'Under the hood',
            body: (
              <ul className="max-w-[68ch] space-y-3">
                {item.notes.map((note, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-accent/40 pl-4 text-[15px] leading-relaxed text-muted"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            ),
          },
        ]
      : []),
  ]

  const [facet, setFacet] = useState(0)
  const active = facets[Math.min(facet, facets.length - 1)]

  return (
    <article className="lab-card overflow-hidden rounded-xl border border-line/90 shadow-lift">
      {item.image ? (
        // Fills its column at the card's full height on desktop; the top of the
        // shot is the part worth keeping, so the crop bites from the bottom.
        <img
          src={item.image.src}
          alt={item.image.alt}
          width={item.image.width}
          height={item.image.height}
          loading="lazy"
          decoding="async"
          className="aspect-[21/9] w-full border-b border-line/90 object-cover object-top"
        />
      ) : null}

      <div className="p-6 sm:p-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-2xl font-bold text-ink sm:text-3xl">{item.name}</h3>
          <span className={`rounded-full border px-3 py-0.5 font-mono text-xs ${status.className}`}>
            {status.label}
          </span>
        </div>
        <p className="mt-2 text-base text-muted">{item.tagline}</p>

        {facets.length > 1 ? (
          <div
            role="tablist"
            aria-label={`${item.name} details`}
            className="mt-5 flex flex-wrap gap-1.5"
            onKeyDown={(event) => {
              const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
              if (!delta) return
              event.preventDefault()
              setFacet((f) => (f + delta + facets.length) % facets.length)
            }}
          >
            {facets.map((f, i) => (
              <button
                key={f.key}
                role="tab"
                type="button"
                aria-selected={i === facet}
                tabIndex={i === facet ? 0 : -1}
                onClick={() => setFacet(i)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  i === facet
                    ? 'bg-accent/12 text-accent'
                    : 'text-faint hover:bg-panel hover:text-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        ) : null}

        {/* A floor, not a fixed height: switching facets must not make the card
            jump, but a longer entry is still allowed to breathe. */}
        <div role="tabpanel" className="mt-4 min-h-[8.5rem]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.key}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0 : 0.2, ease: EASE_ENTRANCE }}
            >
              {active.body}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          {item.tech && item.tech.length > 0 ? (
            <ul className="flex flex-wrap gap-3" aria-label="Built with">
              {orderTech(item.tech).map((key) => (
                <li key={key} className="flex items-center rounded p-0.5">
                  <TechLogo techKey={key} size={20} />
                </li>
              ))}
            </ul>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-5">
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className={LINK_CLASS}
              aria-label={`Open ${item.name}`}
            >
              open →
            </a>
            {item.repo ? (
              <a
                href={item.repo}
                target="_blank"
                rel="noreferrer"
                className={LINK_CLASS}
                aria-label={`${item.name} source repository`}
              >
                repo →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function LabSection() {
  const items = sectionItems('lab')
  const reduced = useReducedMotion()
  const [index, setIndex] = useState(0)
  // Direction only decides which way a slide enters; it is never read for
  // correctness, so an interrupted transition cannot leave the deck confused.
  const [direction, setDirection] = useState(1)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const many = lab.items.length > 1

  const go = useCallback(
    (next: number, focusTab = false) => {
      const clamped = (next + lab.items.length) % lab.items.length
      setDirection(clamped > index || (index === lab.items.length - 1 && clamped === 0) ? 1 : -1)
      setIndex(clamped)
      if (focusTab) tabRefs.current[clamped]?.focus()
    },
    [index],
  )

  // The arrow-key contract a tablist implies: move selection, move focus.
  const onTabKeyDown = (event: React.KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: lab.items.length - 1,
    }
    const next = map[event.key]
    if (next === undefined) return
    event.preventDefault()
    go(next, true)
  }

  const item = lab.items[index]
  const panelId = `lab-panel-${index}`

  return (
    <section id={lab.section.id} aria-labelledby="lab-heading" className="section-shell">
      <SectionHeading
        id="lab-heading"
        index="07"
        title={lab.section.title}
        hint={lab.section.hint}
      />

      <Reveal>
        <div className="lab-deck rounded-2xl p-1">
          {many ? (
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4 px-2 pt-2">
              <div
                role="tablist"
                aria-label={`${lab.section.title} entries`}
                onKeyDown={onTabKeyDown}
                className="flex flex-wrap gap-2"
              >
                {lab.items.map((entry, i) => (
                  <button
                    key={entry.name}
                    id={items[i].id}
                    ref={(el) => {
                      tabRefs.current[i] = el
                    }}
                    role="tab"
                    type="button"
                    aria-selected={i === index}
                    aria-controls={i === index ? panelId : undefined}
                    tabIndex={i === index ? 0 : -1}
                    onClick={() => go(i)}
                    className={`scroll-mt-28 rounded-full border px-4 py-2 font-mono text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                      i === index
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-line bg-panel text-muted hover:border-accent/40 hover:text-ink'
                    }`}
                  >
                    {entry.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <p aria-hidden="true" className="font-mono text-sm text-faint">
                  {String(index + 1).padStart(2, '0')} / {String(lab.items.length).padStart(2, '0')}
                </p>
                <ArrowButton direction="prev" onClick={() => go(index - 1)} disabled={false} />
                <ArrowButton direction="next" onClick={() => go(index + 1)} disabled={false} />
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false} custom={direction}>
              <motion.div
                key={item.name}
                id={many ? panelId : items[0].id}
                role={many ? 'tabpanel' : undefined}
                aria-labelledby={many ? items[index].id : undefined}
                tabIndex={many ? 0 : undefined}
                className="scroll-mt-28 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                initial={reduced ? false : { opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? { opacity: 1 } : { opacity: 0, x: direction * -28 }}
                transition={{ duration: reduced ? 0 : 0.32, ease: EASE_ENTRANCE }}
              >
                <LabCard item={item} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
