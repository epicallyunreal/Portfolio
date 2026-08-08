import { resume, siteStats } from '../lib/data'
import { CountUp } from '../components/CountUp'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

interface Language {
  language: string
  fluency: string
}

export default function About() {
  const stats = siteStats()
  const items = [
    { label: 'Years of experience', value: stats.years, suffix: '+' },
    { label: 'Roles shipped', value: stats.roles },
    { label: 'Projects', value: stats.projects },
    { label: 'Certifications', value: stats.certifications },
  ]
  const education = resume.education ?? []
  const languages = (resume.languages ?? []) as Language[]

  return (
    <section id="about" aria-labelledby="about-heading" className="section-shell">
      <SectionHeading id="about-heading" index="01" title="About" />
      <div className="grid gap-10 md:grid-cols-[3fr,2fr] md:gap-14">
        <div>
          <Reveal from="left">
            <p className="text-lg leading-relaxed text-muted">{resume.basics.summary}</p>
            {resume.basics.location?.city ? (
              <p className="mt-4 font-mono text-sm text-faint">
                {resume.basics.location.city}, {resume.basics.location.countryCode}
              </p>
            ) : null}
          </Reveal>

          {education.length > 0 ? (
            <Reveal from="left" delay={0.1} className="mt-8">
              <h3 className="font-mono text-sm uppercase tracking-wider text-faint">
                <span aria-hidden="true" className="text-accent">
                  ▸{' '}
                </span>
                Education
              </h3>
              <ul className="mt-3 space-y-3">
                {education.map((e) => (
                  <li
                    key={e.institution}
                    className="rounded-lg border border-line bg-panel px-4 py-3"
                  >
                    <p className="font-semibold text-ink">
                      {e.studyType}, {e.area}
                    </p>
                    <p className="mt-0.5 text-sm text-muted">
                      {e.institution}
                      <span className="font-mono text-faint">
                        {' '}
                        · {e.startDate}—{e.endDate}
                        {e.score ? ` · ${e.score}` : ''}
                      </span>
                    </p>
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </div>

        <div className="self-start">
          <ul className="grid grid-cols-2 gap-4">
            {items.map((item, i) => (
              <li key={item.label}>
                <Reveal from="right" delay={i * 0.05}>
                  <div className="rounded-lg border border-line bg-panel p-4 transition-colors hover:border-accent/40">
                    <p className="text-xs uppercase tracking-wider text-faint">{item.label}</p>
                    <p className="mt-1 font-mono text-3xl font-bold text-accent">
                      <CountUp value={item.value} suffix={item.suffix ?? ''} />
                    </p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
          {languages.length > 0 ? (
            <Reveal from="right" delay={0.2} className="mt-4">
              <ul className="flex flex-wrap gap-2" aria-label="Languages">
                {languages.map((l) => (
                  <li
                    key={l.language}
                    className="rounded-full border border-line bg-panel px-3 py-1 text-xs text-muted"
                  >
                    {l.language} · {l.fluency}
                  </li>
                ))}
              </ul>
            </Reveal>
          ) : null}
        </div>
      </div>
    </section>
  )
}
