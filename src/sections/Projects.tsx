import { useRef, useState } from 'react'
import { orderTech, resume } from '../lib/data'
import { filterCardClasses } from '../lib/filterStyles'
import { sectionItems } from '../lib/sections'
import { useFilter } from '../hooks/useFilter'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { MasterDetail } from '../components/MasterDetail'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { TechLogo } from '../components/TechLogo'
import type { Project } from '../lib/types'

const MAX_TILT_DEG = 6

function ProjectCard({ project }: { project: Project }) {
  const { selected } = useFilter()
  const reduced = useReducedMotion()
  const finePointer = useMediaQuery('(pointer: fine)')
  const cardRef = useRef<HTMLElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [expanded, setExpanded] = useState(false)

  const matches = selected === null || (project.x_tech ?? []).includes(selected)
  const tiltEnabled = finePointer && !reduced

  const onMouseMove = (e: React.MouseEvent) => {
    if (!tiltEnabled || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width - 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * MAX_TILT_DEG, y: px * MAX_TILT_DEG })
  }

  return (
    <article
      ref={cardRef}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={
        tiltEnabled
          ? {
              transform: `perspective(900px) rotateX(${tilt.x.toFixed(2)}deg) rotateY(${tilt.y.toFixed(2)}deg)`,
            }
          : undefined
      }
      className={`flex h-full flex-col rounded-lg border p-6 transition-[opacity,border-color,box-shadow] duration-300 will-change-transform hover:shadow-lift ${
        project.x_featured ? 'bg-raised' : 'bg-panel'
      } ${filterCardClasses(selected, matches)}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold text-ink">{project.name}</h3>
        {project.x_featured ? (
          <span className="rounded-full border border-accent/40 px-2.5 py-0.5 font-mono text-xs text-accent">
            featured
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted">{project.description}</p>

      {project.highlights && project.highlights.length > 0 ? (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((v) => !v)}
            className="font-mono text-sm text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {expanded ? '− hide' : '+ show'} {project.highlights.length} highlight
            {project.highlights.length === 1 ? '' : 's'}
          </button>
          {expanded ? (
            <ul className="mt-3 space-y-2">
              {project.highlights.map((highlight, i) => (
                <li
                  key={i}
                  className="border-l-2 border-accent/40 pl-4 text-sm leading-relaxed text-muted"
                >
                  {highlight}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex items-end justify-between gap-4 pt-5">
        {project.x_tech && project.x_tech.length > 0 ? (
          <ul className="flex flex-wrap gap-3" aria-label="Technologies used">
            {orderTech(project.x_tech).map((key) => (
              <li
                key={key}
                className={`flex items-center rounded p-0.5 ${
                  selected === key ? 'ring-1 ring-accent' : ''
                }`}
              >
                <TechLogo techKey={key} size={20} />
              </li>
            ))}
          </ul>
        ) : (
          <span />
        )}
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noreferrer"
            className="whitespace-nowrap font-mono text-sm text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            repo →
          </a>
        ) : null}
      </div>
    </article>
  )
}

export default function Projects() {
  const items = sectionItems('projects')
  return (
    <section id="projects" aria-labelledby="projects-heading" className="section-shell">
      <SectionHeading id="projects-heading" index="04" title="Projects" />
      <MasterDetail items={items} ariaLabel="Projects">
        {resume.projects.map((project, i) => (
          <div key={items[i].id} id={items[i].id} className="scroll-mt-28">
            <Reveal>
              <ProjectCard project={project} />
            </Reveal>
          </div>
        ))}
      </MasterDetail>
    </section>
  )
}
