import { useEffect, type ReactNode } from 'react'
import { formatDate, orderTech, resume, techAsset } from '../lib/data'
import './cv.css'

/**
 * The CV as a print-styled page, rendered at /cv (excluded from the sitemap,
 * marked noindex). Puppeteer prints this route to public/<Name>_CV.pdf
 * in CI — one resume.json, two artifacts.
 *
 * The phone number is never committed: the build passes it via the ?phone=
 * query parameter from the CV_PHONE secret, so the deployed site renders this
 * route without it.
 */

const displayUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')

// Skill-group keywords in the same canonical order as the site, so the CV and
// the page agree. Only the Technical Skills section names technologies — the
// project and certification lines stay prose.
const labels = (keys: string[]) => orderTech(keys).map((k) => techAsset(k).label)

/**
 * A name that becomes a link when there is somewhere to point at. Entries
 * carry `url: ""` when no credential or repo is public, so the empty string
 * has to read as "no link" rather than as a link to the current page.
 */
function Linked({ url, children }: { url?: string; children: ReactNode }) {
  return url ? <a href={url}>{children}</a> : <>{children}</>
}

function certStatusText(cert: (typeof resume.certificates)[number]): string {
  if (cert.x_statusNote) return cert.x_statusNote
  if (cert.x_status === 'in-progress') return `in progress, expected ${formatDate(cert.date)}`
  return formatDate(cert.date)
}

export default function CvPrint() {
  const { basics, x_meta } = resume
  const phone = new URLSearchParams(window.location.search).get('phone')

  useEffect(() => {
    document.title = `${basics.name} — CV v${x_meta.version}`
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [basics.name, x_meta.version])

  const work = [...resume.work].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
  const contactParts = [
    basics.location?.city ? `${basics.location.city}, India` : null,
    phone,
    basics.email,
  ].filter(Boolean)
  // The site leads the links line: it is the one address that carries the
  // others, and the CV is where a reader first meets it.
  const links = [basics.url, ...basics.profiles.map((p) => p.url)].filter(Boolean)

  return (
    <main className="cv-root">
      <header className="cv-header">
        <h1 className="cv-name">{basics.name}</h1>
        <p className="cv-headline">{x_meta.cvHeadline}</p>
        <p className="cv-contact">{contactParts.join('  ·  ')}</p>
        <p className="cv-links">
          {links.map((url, i) => (
            <span key={url}>
              {i > 0 ? '  ·  ' : ''}
              <a href={url}>{displayUrl(url)}</a>
            </span>
          ))}
        </p>
      </header>

      <h2 className="cv-section">Professional Summary</h2>
      <p className="cv-summary">{basics.summary}</p>

      <h2 className="cv-section">Technical Skills</h2>
      {resume.skills.map((group) => (
        <p key={group.name} className="cv-line">
          <strong>{group.name}:</strong> {labels(group.keywords).join(', ')}
          {group.x_note ? ` — ${group.x_note}` : ''}
        </p>
      ))}

      <h2 className="cv-section">Work Experience</h2>
      {work.map((entry) => (
        <div key={`${entry.name}-${entry.startDate}`}>
          <p className="cv-job">
            <span className="cv-job-title">
              <strong>{entry.position}</strong> — {entry.name}
            </span>
            <span className="cv-dates">
              {formatDate(entry.startDate)} – {formatDate(entry.endDate)}
            </span>
          </p>
          <ul className="cv-bullets">
            {entry.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      ))}

      <h2 className="cv-section">Projects</h2>
      {resume.projects.map((project) => (
        <p key={project.name} className="cv-line">
          <strong>
            <Linked url={project.url}>{project.name}</Linked>
          </strong>{' '}
          — {project.description}
        </p>
      ))}

      <h2 className="cv-section">Education</h2>
      {(resume.education ?? []).map((e) => (
        <p key={e.institution} className="cv-line">
          <strong>
            {e.studyType}, {e.area}
          </strong>{' '}
          — {e.institution} ({e.startDate} – {e.endDate}){e.score ? ` · GPA ${e.score}` : ''}
        </p>
      ))}

      <h2 className="cv-section">Certifications</h2>
      <ul className="cv-bullets">
        {resume.certificates.map((cert) => (
          <li key={cert.name}>
            <strong>
              <Linked url={cert.url}>{cert.name}</Linked>
            </strong>{' '}
            — {cert.issuer} ({certStatusText(cert)}){cert.x_note ? ` · ${cert.x_note}` : ''}
          </li>
        ))}
      </ul>

      {resume.awards && resume.awards.length > 0 ? (
        <>
          <h2 className="cv-section">Achievements</h2>
          <ul className="cv-bullets">
            <li>{resume.awards.map((a) => a.title).join(' · ')}.</li>
          </ul>
        </>
      ) : null}

      {resume.languages && resume.languages.length > 0 ? (
        <>
          <h2 className="cv-section">Languages</h2>
          <p className="cv-line">
            {(resume.languages as { language: string }[]).map((l) => l.language).join(', ')}
          </p>
        </>
      ) : null}
    </main>
  )
}
