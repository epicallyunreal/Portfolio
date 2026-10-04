import { useEffect, type ReactNode } from 'react'
import { formatDate, orderTech, orderedProjects, resume, techAsset } from '../lib/data'
import './cv.css'

/**
 * The CV as a print-styled page, rendered at /cv (excluded from the sitemap,
 * marked noindex). The PDF build prints this route twice: once with cv.json
 * (the full document) to documents/<Name>_CV.pdf, and once with
 * data/resume.json to documents/<Name>_Resume.pdf, the one-page version.
 *
 * One component, two lengths. A document that sets x_meta.cvFull prints
 * everything it holds about a project, an award and a language; one that does
 * not keeps the compact lines a single page needs.
 *
 * The phone number is never in the JSON: the build passes it via the ?phone=
 * query parameter from CV_PHONE, so the deployed site renders this route
 * without it.
 */

// `/index.html` is never worth showing — a URL pasted with the directory
// index still reads as an address.
const displayUrl = (url: string) =>
  url
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/index\.html$/i, '')
    .replace(/\/$/, '')

// Skill-group keywords in the same canonical order as the site, so the CV and
// the page agree. Only the Technical Skills section names technologies — the
// project and certification lines stay prose. A document may shorten a label
// for print (x_meta.techLabels); the site never sees those.
const labels = (keys: string[]) =>
  orderTech(keys).map((k) => resume.x_meta.techLabels?.[k] ?? techAsset(k).label)

/**
 * A name that becomes a link when there is somewhere to point at. Entries
 * carry `url: ""` when no credential or repo is public, so the empty string
 * has to read as "no link" rather than as a link to the current page.
 */
function Linked({ url, children }: { url?: string; children: ReactNode }) {
  return url ? <a href={url}>{children}</a> : <>{children}</>
}

/**
 * The CV is a subset of the site, not a mirror of it. Anything carrying
 * `x_cv: false` renders on the page and never reaches the PDF — a place for
 * work worth showing without lengthening the document a recruiter reads.
 * Omitted means included, so existing data needs no migration.
 */
const onCv = <T extends { x_cv?: boolean }>(items: T[] = []): T[] =>
  items.filter((item) => item.x_cv !== false)

function certStatusText(cert: (typeof resume.certificates)[number]): string {
  if (cert.x_statusNote) return cert.x_statusNote
  if (cert.x_status === 'in-progress') return `in progress, expected ${formatDate(cert.date)}`
  return formatDate(cert.date)
}

/** 'Aug 2026' when a project began and ended in one month, otherwise the span. */
function dateRange(start?: string, end?: string): string {
  if (!start || !end || start === end) return start || end ? formatDate(end || start) : ''
  return `${formatDate(start)} – ${formatDate(end)}`
}

/** A year in brackets, unless the title already says it. */
function awardYear(award: { title: string; date: string }): string {
  return award.date && !award.title.includes(award.date) ? ` (${award.date})` : ''
}

export default function CvPrint() {
  const { basics, x_meta } = resume
  const phone = new URLSearchParams(window.location.search).get('phone')

  useEffect(() => {
    document.title = `${basics.name} - CV v${x_meta.version}`
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [basics.name, x_meta.version])

  const work = [...onCv(resume.work)].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))
  // Phone and email are links, so someone reading the PDF on a phone can call
  // or write with one tap. The visible text is unchanged, which is what an
  // applicant-tracking parser reads.
  const contactParts: { text: string; href?: string }[] = []
  if (basics.location?.city) contactParts.push({ text: `${basics.location.city}, India` })
  if (phone) contactParts.push({ text: phone, href: `tel:${phone.replace(/[^+\d]/g, '')}` })
  if (basics.email) contactParts.push({ text: basics.email, href: `mailto:${basics.email}` })
  // The site leads the links line: it is the one address that carries the
  // others, and the CV is where a reader first meets it.
  const links = [basics.url, ...basics.profiles.map((p) => p.url)].filter(Boolean)

  return (
    <main className="cv-root">
      <header className="cv-header">
        <h1 className="cv-name">{basics.name}</h1>
        <p className="cv-headline">{x_meta.cvHeadline}</p>
        <p className="cv-contact">
          {contactParts.map((part, i) => (
            <span key={part.text}>
              {i > 0 ? '  ·  ' : ''}
              <Linked url={part.href}>{part.text}</Linked>
            </span>
          ))}
        </p>
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
      {onCv(resume.skills).map((group) => (
        <p key={group.name} className="cv-line">
          <strong>{group.name}:</strong> {labels(group.keywords).join(', ')}
          {group.x_note ? ` - ${group.x_note}` : ''}
        </p>
      ))}

      <h2 className="cv-section">Work Experience</h2>
      {work.map((entry) => (
        <div key={`${entry.name}-${entry.startDate}`}>
          <p className="cv-job">
            <span className="cv-job-title">
              <strong>{entry.position}</strong> - {entry.name}
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
      {x_meta.cvFull
        ? // The long form. Dates sit where a job's do, both addresses are
          // spelled out because a printed page cannot be clicked, and the
          // highlights follow the description.
          onCv(orderedProjects()).map((project) => {
            const addresses = [project.x_live, project.url].filter((url): url is string => !!url)
            return (
              <div key={project.name} className="cv-entry">
                <p className="cv-job">
                  <span className="cv-job-title">
                    <strong>{project.name}</strong>
                  </span>
                  <span className="cv-dates">{dateRange(project.startDate, project.endDate)}</span>
                </p>
                {addresses.length > 0 ? (
                  <p className="cv-entry-links">
                    {addresses.map((url, i) => (
                      <span key={url}>
                        {i > 0 ? '  ·  ' : ''}
                        <a href={url}>{displayUrl(url)}</a>
                      </span>
                    ))}
                  </p>
                ) : null}
                <p className="cv-line">{project.description}</p>
                {project.highlights && project.highlights.length > 0 ? (
                  <ul className="cv-bullets">
                    {project.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            )
          })
        : onCv(orderedProjects()).map((project) => (
            <p key={project.name} className="cv-line">
              {/* One destination per project, carried by the name. A running
                  instance is what a reader will open, so it wins over the repo
                  when a project has both; the site still shows the pair. */}
              <strong>
                <Linked url={project.x_live ?? project.url}>{project.name}</Linked>
              </strong>{' '}
              - {project.description}
            </p>
          ))}

      {/* From here down each section is short, so each is kept whole: on a
          document of several pages a heading never parts from its lines. */}
      <div className="cv-keep">
        <h2 className="cv-section">Education</h2>
        {onCv(resume.education).map((e) => (
          <p key={e.institution} className="cv-line">
            <strong>
              {e.studyType}, {e.area}
            </strong>{' '}
            - {e.institution} ({e.startDate} – {e.endDate}){e.score ? ` · GPA ${e.score}` : ''}
          </p>
        ))}
      </div>

      <div className="cv-keep">
        <h2 className="cv-section">Certifications</h2>
        {x_meta.cvCertsInline ? (
          // One running line instead of a list, for a CV that has to hold to a
          // single page. Each name still links to its credential; the date and
          // the note are what give way.
          <p className="cv-line">
            {onCv(resume.certificates).map((cert, i) => (
              <span key={cert.name}>
                {i > 0 ? ', ' : ''}
                <strong>
                  <Linked url={cert.url}>{cert.name}</Linked>
                </strong>{' '}
                ({cert.issuer}
                {cert.x_status === 'in-progress' ? `, ${certStatusText(cert)}` : ''})
              </span>
            ))}
          </p>
        ) : (
          <ul className="cv-bullets">
            {onCv(resume.certificates).map((cert) => (
              <li key={cert.name}>
                <strong>
                  <Linked url={cert.url}>{cert.name}</Linked>
                </strong>{' '}
                - {cert.issuer} ({certStatusText(cert)}){cert.x_note ? ` · ${cert.x_note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>

      {onCv(resume.awards).length > 0 ? (
        <div className="cv-keep">
          <h2 className="cv-section">Achievements</h2>
          <ul className="cv-bullets">
            {x_meta.cvFull ? (
              onCv(resume.awards).map((a) => (
                <li key={a.title}>
                  <strong>{a.title}</strong>
                  {awardYear(a)}
                  {a.summary ? `. ${a.summary}` : ''}
                </li>
              ))
            ) : (
              <li>
                {onCv(resume.awards)
                  .map((a) => a.title)
                  .join(' · ')}
                .
              </li>
            )}
          </ul>
        </div>
      ) : null}

      {resume.languages && resume.languages.length > 0 ? (
        <div className="cv-keep">
          <h2 className="cv-section">Languages</h2>
          <p className="cv-line">
            {(resume.languages as { language: string; fluency?: string }[])
              .map((l) =>
                x_meta.cvFull && l.fluency
                  ? `${l.language} (${l.fluency.toLowerCase()})`
                  : l.language,
              )
              .join(', ')}
          </p>
        </div>
      ) : null}
    </main>
  )
}
