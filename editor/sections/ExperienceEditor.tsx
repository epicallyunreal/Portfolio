import type { Resume, WorkEntry } from '../../src/lib/types'
import {
  CvToggle,
  Btn,
  EntryCard,
  Field,
  StringList,
  TextArea,
  TextInput,
} from '../components/Fields'
import { listOps } from '../lib/listOps'
import { TechPicker } from '../components/TechPicker'

const BLANK: WorkEntry = {
  name: '',
  position: '',
  startDate: '',
  endDate: null,
  summary: '',
  highlights: [],
  x_tech: [],
}

export function ExperienceEditor({
  resume,
  update,
  techKeys,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
  techKeys: string[]
}) {
  const work = resume.work ?? []
  const ops = listOps(work, (next) =>
    update((draft) => {
      draft.work = next
    }),
  )

  return (
    <div className="space-y-4">
      {work.map((entry, i) => (
        <EntryCard
          key={i}
          title={`${entry.position} — ${entry.name}`}
          index={i}
          count={work.length}
          onMove={(d) => ops.move(i, d)}
          onRemove={() => ops.remove(i)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Position">
              <TextInput
                value={entry.position}
                onChange={(v) => ops.set(i, { ...entry, position: v })}
              />
            </Field>
            <Field label="Company">
              <TextInput value={entry.name} onChange={(v) => ops.set(i, { ...entry, name: v })} />
            </Field>
            <Field label="Start date" hint="YYYY-MM">
              <TextInput
                value={entry.startDate}
                onChange={(v) => ops.set(i, { ...entry, startDate: v })}
                placeholder="2025-12"
              />
            </Field>
            <Field label="End date" hint="Leave empty for 'Present'">
              <TextInput
                value={entry.endDate ?? ''}
                onChange={(v) => ops.set(i, { ...entry, endDate: v === '' ? null : v })}
                placeholder="Present"
              />
            </Field>
          </div>
          <Field label="Summary">
            <TextArea
              value={entry.summary ?? ''}
              onChange={(v) => ops.set(i, { ...entry, summary: v })}
              rows={2}
            />
          </Field>
          <Field label="Highlights">
            <StringList
              values={entry.highlights ?? []}
              onChange={(v) => ops.set(i, { ...entry, highlights: v })}
            />
          </Field>
          <Field label="Tech" hint="Also editable from Skills & Tags.">
            <TechPicker
              techKeys={techKeys}
              selected={entry.x_tech ?? []}
              onChange={(v) => ops.set(i, { ...entry, x_tech: v })}
            />
          </Field>
          <CvToggle value={entry.x_cv} onChange={(v) => ops.set(i, { ...entry, x_cv: v })} />
        </EntryCard>
      ))}
      <Btn onClick={() => ops.add({ ...BLANK })}>+ add role</Btn>
    </div>
  )
}
