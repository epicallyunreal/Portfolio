import { Fragment } from 'react'
import { motion } from 'motion/react'
import { resume, techAsset } from '../lib/data'
import { certItemId, projectItemId, sectionItems, workItemId } from '../lib/sections'
import { scrollToSection } from '../lib/scroll'
import { useFilter } from '../hooks/useFilter'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { EASE_ENTRANCE } from '../lib/motion'
import { MasterDetail } from '../components/MasterDetail'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { TechLogo } from '../components/TechLogo'

interface MatchLink {
  id: string
  label: string
  sub?: string
}

interface MatchGroup {
  heading: string
  links: MatchLink[]
}

/** Everything in the resume that uses the given tech key, as sectional links. */
function matchesFor(techKey: string): MatchGroup[] {
  const groups: MatchGroup[] = [
    {
      heading: 'Experience',
      links: resume.work
        .map((w, i) => ({ w, i }))
        .filter(({ w }) => w.x_tech?.includes(techKey))
        .map(({ w, i }) => ({ id: workItemId(i), label: w.position, sub: w.name })),
    },
    {
      heading: 'Projects',
      links: resume.projects
        .filter((p) => p.x_tech?.includes(techKey))
        .map((p) => ({ id: projectItemId(p.name), label: p.name })),
    },
    {
      heading: 'Certifications',
      links: resume.certificates
        .filter((c) => c.x_tech?.includes(techKey))
        .map((c) => ({ id: certItemId(c.name), label: c.name, sub: c.issuer })),
    },
  ]
  return groups.filter((g) => g.links.length > 0)
}

/**
 * The expansion panel that opens in the grid row below a selected tile:
 * every role, project and certification using the skill, as clickable
 * sectional links.
 */
function SkillMatches({ techKey }: { techKey: string }) {
  const { clear } = useFilter()
  const reduced = useReducedMotion()
  const asset = techAsset(techKey)
  const groups = matchesFor(techKey)

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE_ENTRANCE }}
      className="rounded-lg border border-accent/50 bg-raised p-5"
    >
      <div className="flex items-center gap-3">
        <TechLogo techKey={techKey} size={22} labelled />
        <p className="font-mono text-sm text-ink">{asset.label}</p>
        <button
          type="button"
          onClick={clear}
          aria-label={`Stop filtering by ${asset.label}`}
          className="pressable ml-auto rounded border border-line bg-panel px-2 py-0.5 font-mono text-xs text-muted transition-colors hover:border-accent hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
        >
          close ×
        </button>
      </div>
      {groups.length > 0 ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div key={group.heading}>
              <h4 className="font-mono text-xs uppercase tracking-wider text-faint">
                {group.heading}
              </h4>
              <ul className="mt-2 space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={`#${link.id}`}
                      onClick={(e) => {
                        e.preventDefault()
                        scrollToSection(link.id, reduced)
                      }}
                      className="group block rounded outline-none focus-visible:underline focus-visible:decoration-accent focus-visible:underline-offset-4"
                    >
                      <span className="text-sm text-accent underline-offset-4 group-hover:underline">
                        {link.label}
                      </span>
                      {link.sub ? (
                        <span className="ml-1.5 text-xs text-muted">· {link.sub}</span>
                      ) : null}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">Nothing tagged with this yet.</p>
      )}
    </motion.div>
  )
}

function SkillTile({ techKey }: { techKey: string }) {
  const { selected, toggle } = useFilter()
  const asset = techAsset(techKey)
  const isSelected = selected === techKey

  return (
    <button
      type="button"
      onClick={() => toggle(techKey)}
      aria-pressed={isSelected}
      aria-label={`${asset.label} — show where it's used`}
      style={{ '--tile-accent': asset.color } as React.CSSProperties}
      className={`pressable group flex h-full w-full flex-col items-center gap-2 rounded-lg border p-4 transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        isSelected
          ? 'scale-[1.06] border-accent bg-raised shadow-glow'
          : 'border-line bg-panel hover:-translate-y-1 hover:border-[var(--tile-accent)]'
      }`}
    >
      <TechLogo
        techKey={techKey}
        size={32}
        labelled
        className={`transition-all duration-200 ${
          isSelected ? '' : 'grayscale group-hover:grayscale-0'
        }`}
      />
      <span
        className={`text-center text-xs leading-tight group-hover:text-ink ${
          isSelected ? 'text-ink' : 'text-muted'
        }`}
      >
        {asset.label}
      </span>
    </button>
  )
}

export default function Skills() {
  const { selected } = useFilter()
  const items = sectionItems('skills')

  return (
    <section id="skills" aria-labelledby="skills-heading" className="section-shell">
      <SectionHeading
        id="skills-heading"
        index="03"
        title="Skills"
        hint="Click a skill to see every role, project and certification that uses it."
      />
      <MasterDetail items={items} ariaLabel="Skill groups">
        {resume.skills.map((group, gi) => {
          return (
            <div key={items[gi].id} id={items[gi].id} className="scroll-mt-28">
              <Reveal>
                <h3 className="mb-1 font-mono text-sm uppercase tracking-wider text-faint">
                  <span aria-hidden="true" className="text-accent">
                    ▸{' '}
                  </span>
                  {group.name}
                </h3>
                {group.x_note ? <p className="mb-3 text-xs text-faint">{group.x_note}</p> : null}
                <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {group.keywords.map((key) => (
                    <Fragment key={key}>
                      <li className="h-full">
                        <SkillTile techKey={key} />
                      </li>
                      {/* the expansion opens in a full row directly below the
                          selected tile, pushing the rest of the grid down */}
                      {selected === key ? (
                        <li className="col-span-full">
                          <SkillMatches techKey={key} />
                        </li>
                      ) : null}
                    </Fragment>
                  ))}
                </ul>
              </Reveal>
            </div>
          )
        })}
      </MasterDetail>
    </section>
  )
}
