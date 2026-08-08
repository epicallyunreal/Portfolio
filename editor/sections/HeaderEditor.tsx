import type { Resume } from '../../src/lib/types'
import { Btn, EntryCard, Field, TextArea, TextInput } from '../components/Fields'
import { listOps } from '../lib/listOps'

export function HeaderEditor({
  resume,
  update,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
}) {
  const { basics } = resume
  const set = <K extends keyof Resume['basics']>(key: K, value: Resume['basics'][K]) =>
    update((draft) => {
      draft.basics[key] = value
    })

  const profiles = basics.profiles ?? []
  const ops = listOps(profiles, (next) =>
    update((draft) => {
      draft.basics.profiles = next
    }),
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <TextInput value={basics.name} onChange={(v) => set('name', v)} />
        </Field>
        <Field label="Label (site headline under the name)">
          <TextInput value={basics.label} onChange={(v) => set('label', v)} />
        </Field>
        <Field label="Email">
          <TextInput type="email" value={basics.email} onChange={(v) => set('email', v)} />
        </Field>
        <Field label="Site URL">
          <TextInput value={basics.url} onChange={(v) => set('url', v)} />
        </Field>
        <Field label="City">
          <TextInput
            value={basics.location?.city ?? ''}
            onChange={(v) =>
              update((draft) => {
                draft.basics.location = { ...draft.basics.location, city: v }
              })
            }
          />
        </Field>
        <Field label="Country code">
          <TextInput
            value={basics.location?.countryCode ?? ''}
            onChange={(v) =>
              update((draft) => {
                draft.basics.location = { ...draft.basics.location, countryCode: v }
              })
            }
          />
        </Field>
        <Field
          label="Image path"
          hint="Must exist under public/. Run scripts/optimize-headshot.mjs for new photos."
        >
          <TextInput value={basics.image ?? ''} onChange={(v) => set('image', v)} />
        </Field>
        <Field
          label="Phone"
          hint="Locked empty on purpose — the CV phone comes from the CV_PHONE env var, never from committed JSON."
        >
          <TextInput value="" onChange={() => {}} placeholder="not stored in JSON" />
        </Field>
      </div>

      <Field label="Summary (About section + CV professional summary)">
        <TextArea value={basics.summary} onChange={(v) => set('summary', v)} rows={7} />
      </Field>

      <div>
        <h2 className="mb-3 font-mono text-sm uppercase tracking-wider text-faint">
          Profile links
        </h2>
        <div className="space-y-3">
          {profiles.map((profile, i) => (
            <EntryCard
              key={i}
              title={profile.network}
              index={i}
              count={profiles.length}
              level={3}
              onMove={(d) => ops.move(i, d)}
              onRemove={() => ops.remove(i)}
            >
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="Network">
                  <TextInput
                    value={profile.network}
                    onChange={(v) => ops.set(i, { ...profile, network: v })}
                  />
                </Field>
                <Field label="Username">
                  <TextInput
                    value={profile.username}
                    onChange={(v) => ops.set(i, { ...profile, username: v })}
                  />
                </Field>
                <Field label="URL">
                  <TextInput
                    value={profile.url}
                    onChange={(v) => ops.set(i, { ...profile, url: v })}
                  />
                </Field>
              </div>
            </EntryCard>
          ))}
          <Btn onClick={() => ops.add({ network: '', username: '', url: '' })}>+ add profile</Btn>
        </div>
      </div>
    </div>
  )
}
