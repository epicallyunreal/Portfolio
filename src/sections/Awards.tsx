import { resume } from '../lib/data'
import { sectionItems } from '../lib/sections'
import { MasterDetail } from '../components/MasterDetail'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'
import type { Award } from '../lib/types'

function AwardCard({ award }: { award: Award }) {
  return (
    <article className="h-full rounded-lg border border-line bg-panel p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-lift">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-bold text-ink">{award.title}</h3>
        <p className="font-mono text-sm text-faint">{award.date}</p>
      </div>
      <p className="mt-2 text-sm text-muted">{award.awarder}</p>
      {award.summary ? <p className="mt-3 text-sm text-muted">{award.summary}</p> : null}
    </article>
  )
}

export default function Awards() {
  const awards = resume.awards ?? []
  const items = sectionItems('awards')
  return (
    <section id="awards" aria-labelledby="awards-heading" className="section-shell">
      <SectionHeading id="awards-heading" index="06" title="Awards" />
      <MasterDetail items={items} ariaLabel="Awards">
        {awards.map((award, i) => (
          <div key={items[i].id} id={items[i].id} className="scroll-mt-28">
            <Reveal>
              <AwardCard award={award} />
            </Reveal>
          </div>
        ))}
      </MasterDetail>
    </section>
  )
}
