import { formatDate, resume } from '../lib/data'
import { filterCardClasses } from '../lib/filterStyles'
import { sectionItems } from '../lib/sections'
import { useFilter } from '../hooks/useFilter'
import { MasterDetail } from '../components/MasterDetail'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import { TechLogo } from '../components/TechLogo'
import type { Certificate } from '../lib/types'

function CertificateCard({ cert }: { cert: Certificate }) {
  const { selected } = useFilter()
  const inProgress = cert.x_status === 'in-progress'
  const matches = selected === null || (cert.x_tech ?? []).includes(selected)

  const body = (
    <article
      className={`h-full rounded-lg bg-panel p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${
        inProgress ? 'border-2 border-dashed' : 'border'
      } ${filterCardClasses(selected, matches)} ${cert.url ? 'hover:border-accent' : 'hover:border-accent/40'}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-lg font-bold text-ink">{cert.name}</h3>
        {inProgress ? (
          <span className="rounded-full border border-amber-400/50 px-2.5 py-0.5 font-mono text-xs text-amber-300">
            In progress
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">{cert.issuer}</p>
      <p className="mt-1 font-mono text-sm text-faint">
        {cert.x_statusNote ??
          (inProgress ? `expected ${formatDate(cert.date)}` : formatDate(cert.date))}
      </p>
      {cert.x_note ? <p className="mt-2 text-sm text-muted">{cert.x_note}</p> : null}
      {cert.x_tech && cert.x_tech.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-3" aria-label="Related technologies">
          {cert.x_tech.map((key) => (
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
      ) : null}
      {cert.url ? <p className="mt-3 font-mono text-sm text-accent">credential →</p> : null}
    </article>
  )

  return cert.url ? (
    <a
      href={cert.url}
      target="_blank"
      rel="noreferrer"
      className="block h-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {body}
    </a>
  ) : (
    body
  )
}

export default function Certifications() {
  const items = sectionItems('certifications')
  return (
    <section id="certifications" aria-labelledby="certifications-heading" className="section-shell">
      <SectionHeading id="certifications-heading" index="05" title="Certifications" />
      <MasterDetail items={items} ariaLabel="Certifications">
        {resume.certificates.map((cert, i) => (
          <div key={items[i].id} id={items[i].id} className="scroll-mt-28">
            <Reveal>
              <CertificateCard cert={cert} />
            </Reveal>
          </div>
        ))}
      </MasterDetail>
    </section>
  )
}
