import type { Assets, Award, Resume, SectionId } from '../../src/lib/types'
import { Btn, EntryCard, Field, TextInput, Toggle } from '../components/Fields'
import { listOps } from '../lib/listOps'

/* ---------------------------------------------------------------- Awards */

const BLANK_AWARD: Award = { title: '', awarder: '', date: '' }

export function AwardsEditor({
  resume,
  update,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
}) {
  const awards = resume.awards ?? []
  const ops = listOps(awards, (next) =>
    update((draft) => {
      draft.awards = next
    }),
  )
  return (
    <div className="space-y-4">
      {awards.map((award, i) => (
        <EntryCard
          key={i}
          title={award.title}
          index={i}
          count={awards.length}
          onMove={(d) => ops.move(i, d)}
          onRemove={() => ops.remove(i)}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Title">
              <TextInput value={award.title} onChange={(v) => ops.set(i, { ...award, title: v })} />
            </Field>
            <Field label="Awarder">
              <TextInput
                value={award.awarder}
                onChange={(v) => ops.set(i, { ...award, awarder: v })}
              />
            </Field>
            <Field label="Date">
              <TextInput value={award.date} onChange={(v) => ops.set(i, { ...award, date: v })} />
            </Field>
          </div>
          <Field label="Summary">
            <TextInput
              value={award.summary ?? ''}
              onChange={(v) => ops.set(i, { ...award, summary: v || undefined })}
            />
          </Field>
        </EntryCard>
      ))}
      <Btn onClick={() => ops.add({ ...BLANK_AWARD })}>+ add award</Btn>
    </div>
  )
}

/* ------------------------------------------- Education & Languages */

interface EducationEntry {
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string
  score?: string
}
interface LanguageEntry {
  language: string
  fluency: string
}

export function EducationEditor({
  resume,
  update,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
}) {
  const education = (resume.education ?? []) as EducationEntry[]
  const languages = (resume.languages ?? []) as LanguageEntry[]
  const eduOps = listOps(education, (next) =>
    update((draft) => {
      draft.education = next
    }),
  )
  const langOps = listOps(languages, (next) =>
    update((draft) => {
      draft.languages = next
    }),
  )

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-faint">Education</h2>
        <div className="space-y-4">
          {education.map((entry, i) => (
            <EntryCard
              key={i}
              title={`${entry.studyType} — ${entry.institution}`}
              index={i}
              count={education.length}
              level={3}
              onMove={(d) => eduOps.move(i, d)}
              onRemove={() => eduOps.remove(i)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Institution">
                  <TextInput
                    value={entry.institution}
                    onChange={(v) => eduOps.set(i, { ...entry, institution: v })}
                  />
                </Field>
                <Field label="Area">
                  <TextInput
                    value={entry.area}
                    onChange={(v) => eduOps.set(i, { ...entry, area: v })}
                  />
                </Field>
                <Field label="Study type">
                  <TextInput
                    value={entry.studyType}
                    onChange={(v) => eduOps.set(i, { ...entry, studyType: v })}
                  />
                </Field>
                <Field label="Score">
                  <TextInput
                    value={entry.score ?? ''}
                    onChange={(v) => eduOps.set(i, { ...entry, score: v })}
                  />
                </Field>
                <Field label="Start">
                  <TextInput
                    value={entry.startDate}
                    onChange={(v) => eduOps.set(i, { ...entry, startDate: v })}
                  />
                </Field>
                <Field label="End">
                  <TextInput
                    value={entry.endDate}
                    onChange={(v) => eduOps.set(i, { ...entry, endDate: v })}
                  />
                </Field>
              </div>
            </EntryCard>
          ))}
          <Btn
            onClick={() =>
              eduOps.add({
                institution: '',
                area: '',
                studyType: '',
                startDate: '',
                endDate: '',
                score: '',
              })
            }
          >
            + add education
          </Btn>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-faint">Languages</h2>
        <div className="space-y-4">
          {languages.map((entry, i) => (
            <EntryCard
              key={i}
              title={entry.language}
              index={i}
              count={languages.length}
              level={3}
              onMove={(d) => langOps.move(i, d)}
              onRemove={() => langOps.remove(i)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Language">
                  <TextInput
                    value={entry.language}
                    onChange={(v) => langOps.set(i, { ...entry, language: v })}
                  />
                </Field>
                <Field label="Fluency">
                  <TextInput
                    value={entry.fluency}
                    onChange={(v) => langOps.set(i, { ...entry, fluency: v })}
                  />
                </Field>
              </div>
            </EntryCard>
          ))}
          <Btn onClick={() => langOps.add({ language: '', fluency: '' })}>+ add language</Btn>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------ Meta & sections */

const ALL_SECTIONS: SectionId[] = [
  'about',
  'experience',
  'skills',
  'projects',
  'certifications',
  'awards',
  'contact',
]

export function MetaEditor({
  resume,
  update,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
}) {
  const meta = resume.x_meta
  const set = <K extends keyof Resume['x_meta']>(key: K, value: Resume['x_meta'][K]) =>
    update((draft) => {
      draft.x_meta[key] = value
    })
  const order = meta.sectionOrder

  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    const next = [...order]
    ;[next[index], next[target]] = [next[target], next[index]]
    set('sectionOrder', next)
  }

  return (
    <div className="space-y-6">
      <Field label="Site headline" hint="Typed under the name in the hero.">
        <TextInput value={meta.headline} onChange={(v) => set('headline', v)} />
      </Field>
      <Field label="CV headline" hint="Header line in the PDF — usually longer than the site one.">
        <TextInput value={meta.cvHeadline} onChange={(v) => set('cvHeadline', v)} />
      </Field>
      <Field label="Availability">
        <TextInput value={meta.availability} onChange={(v) => set('availability', v)} />
      </Field>
      <Field label="Career start" hint="YYYY-MM — drives the years-of-experience stat.">
        <TextInput value={meta.careerStart ?? ''} onChange={(v) => set('careerStart', v)} />
      </Field>
      <Field
        label="Version"
        hint="Bumped automatically on every save; shown in the footer and the PDF metadata."
      >
        <TextInput value={meta.version} onChange={(v) => set('version', v)} />
      </Field>

      <div>
        <h2 className="mb-1 font-mono text-sm uppercase tracking-wider text-faint">
          Section order
        </h2>
        <p className="mb-3 text-xs text-faint">
          A listed section with no data fails validation rather than rendering empty.
        </p>
        <ul className="space-y-2">
          {order.map((id, i) => (
            <li
              key={id}
              className="flex items-center gap-2 rounded border border-line bg-panel p-2"
            >
              <span className="font-mono text-xs text-faint">{i + 1}</span>
              <span className="flex-1 text-sm text-ink">{id}</span>
              <Btn onClick={() => move(i, -1)} disabled={i === 0}>
                ↑
              </Btn>
              <Btn onClick={() => move(i, 1)} disabled={i === order.length - 1}>
                ↓
              </Btn>
              <Btn
                variant="danger"
                onClick={() =>
                  set(
                    'sectionOrder',
                    order.filter((s) => s !== id),
                  )
                }
              >
                ×
              </Btn>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_SECTIONS.filter((s) => !order.includes(s)).map((s) => (
            <Btn key={s} onClick={() => set('sectionOrder', [...order, s])}>
              + {s}
            </Btn>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------- Tech & images */

export function AssetsEditor({
  assets,
  update,
  groupedKeys,
}: {
  assets: Assets
  update: (mutate: (draft: Assets) => void) => void
  /** Tech keys that belong to a skill group; anything else never renders. */
  groupedKeys: Set<string>
}) {
  const techEntries = Object.entries(assets.tech)
  const imageEntries = Object.entries(assets.images)

  const renameTech = (oldKey: string, newKey: string) =>
    update((draft) => {
      if (!newKey || newKey === oldKey || draft.tech[newKey]) return
      const rebuilt: typeof draft.tech = {}
      for (const [k, v] of Object.entries(draft.tech)) rebuilt[k === oldKey ? newKey : k] = v
      draft.tech = rebuilt
    })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="mb-1 font-mono text-sm uppercase tracking-wider text-faint">
          Tech registry
        </h2>
        <p className="mb-3 text-xs text-faint">
          CDN URLs must be version-pinned (never <code>@latest</code>); local paths must exist under
          public/. Leave the source empty to render initials instead of a logo. Renaming a key here
          does not update entries that reference it — retag them under Skills. Deleting lives under{' '}
          <strong>Skills &amp; Tags</strong>, where it can also strip every reference in one step.
        </p>
        <div className="space-y-3">
          {techEntries.map(([key, entry]) => (
            <div
              key={key}
              className={`rounded-lg border bg-panel p-4 ${
                groupedKeys.has(key) ? 'border-line' : 'border-amber-400/50'
              }`}
            >
              {!groupedKeys.has(key) ? (
                <p className="mb-3 font-mono text-xs text-amber-300">
                  ⚠ not in any skill group — never rendered on the site
                </p>
              ) : null}
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Key">
                  <TextInput value={key} onChange={(v) => renameTech(key, v)} />
                </Field>
                <Field label="Label">
                  <TextInput
                    value={entry.label}
                    onChange={(v) =>
                      update((draft) => {
                        draft.tech[key].label = v
                      })
                    }
                  />
                </Field>
                <Field label="Source URL or /path">
                  <TextInput
                    value={entry.src}
                    onChange={(v) =>
                      update((draft) => {
                        draft.tech[key].src = v
                      })
                    }
                  />
                </Field>
                <Field label="Colour" hint="#RRGGBB">
                  <TextInput
                    value={entry.color}
                    onChange={(v) =>
                      update((draft) => {
                        draft.tech[key].color = v
                      })
                    }
                  />
                </Field>
              </div>
              <div className="mt-3">
                <Toggle
                  checked={Boolean(entry.mono)}
                  onChange={(v) =>
                    update((draft) => {
                      if (v) draft.tech[key].mono = true
                      else delete draft.tech[key].mono
                    })
                  }
                  label="Monochrome icon (inverted on the dark theme)"
                />
              </div>
            </div>
          ))}
          <Btn
            onClick={() =>
              update((draft) => {
                let key = 'new-tech'
                let n = 1
                while (draft.tech[key]) key = `new-tech-${n++}`
                draft.tech[key] = {
                  label: 'New tech',
                  src: '/logos/_generic.svg',
                  color: '#22D3EE',
                }
              })
            }
          >
            + add tech
          </Btn>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-faint">Images</h2>
        <div className="space-y-3">
          {imageEntries.map(([key, entry]) => (
            <div key={key} className="rounded-lg border border-line bg-panel p-4">
              <p className="mb-3 font-mono text-sm text-accent">{key}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Source">
                  <TextInput
                    value={entry.src}
                    onChange={(v) =>
                      update((draft) => {
                        draft.images[key].src = v
                      })
                    }
                  />
                </Field>
                <Field label="Alt text">
                  <TextInput
                    value={entry.alt}
                    onChange={(v) =>
                      update((draft) => {
                        draft.images[key].alt = v
                      })
                    }
                  />
                </Field>
                <Field label="Width">
                  <TextInput
                    value={String(entry.width)}
                    onChange={(v) =>
                      update((draft) => {
                        draft.images[key].width = Number(v) || 0
                      })
                    }
                  />
                </Field>
                <Field label="Height">
                  <TextInput
                    value={String(entry.height)}
                    onChange={(v) =>
                      update((draft) => {
                        draft.images[key].height = Number(v) || 0
                      })
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Field label="Fallback logo" hint="Used when a tech key has no icon of its own.">
        <TextInput
          value={assets.defaults.fallback}
          onChange={(v) =>
            update((draft) => {
              draft.defaults.fallback = v
            })
          }
        />
      </Field>
    </div>
  )
}
