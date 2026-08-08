import { useState } from 'react'
import { motion } from 'motion/react'
import { formatDate, orderTech, resume } from '../lib/data'
import { filterCardClasses } from '../lib/filterStyles'
import { sectionItems } from '../lib/sections'
import { useFilter } from '../hooks/useFilter'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { EASE_ENTRANCE, STAGGER } from '../lib/motion'
import { MasterDetail } from '../components/MasterDetail'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { TechLogo } from '../components/TechLogo'
import type { WorkEntry } from '../lib/types'

// First N highlights always show; the rest expand on demand.
const HIGHLIGHT_PREVIEW = 2

function WorkCard({ entry }: { entry: WorkEntry }) {
  const reduced = useReducedMotion()
  const { selected } = useFilter()
  const [expanded, setExpanded] = useState(false)

  const matches = selected === null || (entry.x_tech ?? []).includes(selected)
  const preview = entry.highlights.slice(0, HIGHLIGHT_PREVIEW)
  const rest = entry.highlights.slice(HIGHLIGHT_PREVIEW)

  return (
    <article
      className={`relative rounded-lg border bg-panel p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift ${filterCardClasses(selected, matches)}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold text-ink">{entry.position}</h3>
        <p className="font-mono text-sm text-accent">
          {formatDate(entry.startDate)} — {formatDate(entry.endDate)}
        </p>
      </div>
      <p className="mt-1 font-medium text-muted">{entry.name}</p>
      {entry.summary ? <p className="mt-3 text-sm text-muted">{entry.summary}</p> : null}

      {entry.highlights.length > 0 ? (
        <>
          <ul className="mt-4 space-y-2">
            {preview.map((highlight, i) => (
              <li
                key={i}
                className="border-l-2 border-accent/40 pl-4 text-sm leading-relaxed text-muted"
              >
                {highlight}
              </li>
            ))}
            {expanded
              ? rest.map((highlight, i) => (
                  <motion.li
                    key={`rest-${i}`}
                    initial={reduced ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, ease: EASE_ENTRANCE, delay: i * STAGGER }}
                    className="border-l-2 border-accent/40 pl-4 text-sm leading-relaxed text-muted"
                  >
                    {highlight}
                  </motion.li>
                ))
              : null}
          </ul>
          {rest.length > 0 ? (
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
              className="mt-3 font-mono text-sm text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {expanded
                ? '− show fewer'
                : `+ ${rest.length} more highlight${rest.length === 1 ? '' : 's'}`}
            </button>
          ) : null}
        </>
      ) : null}

      {entry.x_tech && entry.x_tech.length > 0 ? (
        <ul className="mt-5 flex flex-wrap gap-3" aria-label="Technologies used">
          {orderTech(entry.x_tech).map((key) => (
            <li
              key={key}
              className={`flex items-center rounded p-0.5 ${
                selected === key ? 'ring-1 ring-accent' : ''
              }`}
            >
              <TechLogo techKey={key} size={22} />
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}

export default function Experience() {
  const items = sectionItems('experience')
  return (
    <section id="experience" aria-labelledby="experience-heading" className="section-shell">
      <SectionHeading id="experience-heading" index="02" title="Experience" />
      <MasterDetail items={items} ariaLabel="Roles">
        {resume.work.map((entry, i) => (
          <div key={items[i].id} id={items[i].id} className="scroll-mt-28">
            <Reveal>
              <WorkCard entry={entry} />
            </Reveal>
          </div>
        ))}
      </MasterDetail>
    </section>
  )
}
