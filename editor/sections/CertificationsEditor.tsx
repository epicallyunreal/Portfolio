import type { Certificate, Resume } from '../../src/lib/types'
import { Btn, EntryCard, Field, Select, TextInput } from '../components/Fields'
import { listOps } from '../lib/listOps'
import { TechPicker } from '../components/TechPicker'

const BLANK: Certificate = {
  name: '',
  issuer: '',
  date: '',
  url: '',
  x_status: 'completed',
  x_tech: [],
}

export function CertificationsEditor({
  resume,
  update,
  techKeys,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
  techKeys: string[]
}) {
  const certs = resume.certificates ?? []
  const ops = listOps(certs, (next) =>
    update((draft) => {
      draft.certificates = next
    }),
  )

  return (
    <div className="space-y-4">
      {certs.map((cert, i) => (
        <EntryCard
          key={i}
          title={cert.name}
          index={i}
          count={certs.length}
          onMove={(d) => ops.move(i, d)}
          onRemove={() => ops.remove(i)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <TextInput value={cert.name} onChange={(v) => ops.set(i, { ...cert, name: v })} />
            </Field>
            <Field label="Issuer">
              <TextInput value={cert.issuer} onChange={(v) => ops.set(i, { ...cert, issuer: v })} />
            </Field>
            <Field label="Date" hint="YYYY or YYYY-MM">
              <TextInput value={cert.date} onChange={(v) => ops.set(i, { ...cert, date: v })} />
            </Field>
            <Field label="Status">
              <Select
                value={cert.x_status ?? 'completed'}
                onChange={(v) => ops.set(i, { ...cert, x_status: v })}
                options={[
                  { value: 'completed', label: 'completed' },
                  { value: 'in-progress', label: 'in-progress' },
                ]}
              />
            </Field>
            <Field label="Credential URL" hint="Leave empty for no link.">
              <TextInput value={cert.url ?? ''} onChange={(v) => ops.set(i, { ...cert, url: v })} />
            </Field>
            <Field label="Status note" hint="Overrides the computed status text in the CV.">
              <TextInput
                value={cert.x_statusNote ?? ''}
                onChange={(v) => ops.set(i, { ...cert, x_statusNote: v || undefined })}
              />
            </Field>
          </div>
          <Field label="Note" hint="Extra detail shown on the card and in the CV line.">
            <TextInput
              value={cert.x_note ?? ''}
              onChange={(v) => ops.set(i, { ...cert, x_note: v || undefined })}
            />
          </Field>
          <Field label="Related tech">
            <TechPicker
              techKeys={techKeys}
              selected={cert.x_tech ?? []}
              onChange={(v) => ops.set(i, { ...cert, x_tech: v })}
            />
          </Field>
        </EntryCard>
      ))}
      <Btn onClick={() => ops.add({ ...BLANK })}>+ add certification</Btn>
    </div>
  )
}
