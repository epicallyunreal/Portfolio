import type { Project, Resume } from '../../src/lib/types'
import {
  Btn,
  EntryCard,
  Field,
  StringList,
  TextArea,
  TextInput,
  Toggle,
} from '../components/Fields'
import { listOps } from '../lib/listOps'
import { TechPicker } from '../components/TechPicker'

const BLANK: Project = {
  name: '',
  description: '',
  url: '',
  highlights: [],
  x_tech: [],
  x_featured: false,
}

export function ProjectsEditor({
  resume,
  update,
  techKeys,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
  techKeys: string[]
}) {
  const projects = resume.projects ?? []
  const ops = listOps(projects, (next) =>
    update((draft) => {
      draft.projects = next
    }),
  )

  return (
    <div className="space-y-4">
      {projects.map((project, i) => (
        <EntryCard
          key={i}
          title={project.name}
          index={i}
          count={projects.length}
          onMove={(d) => ops.move(i, d)}
          onRemove={() => ops.remove(i)}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name">
              <TextInput
                value={project.name}
                onChange={(v) => ops.set(i, { ...project, name: v })}
              />
            </Field>
            <Field label="URL" hint="Repo or live link. Leave empty for no link.">
              <TextInput
                value={project.url ?? ''}
                onChange={(v) => ops.set(i, { ...project, url: v })}
              />
            </Field>
          </div>
          <Field label="Description">
            <TextArea
              value={project.description}
              onChange={(v) => ops.set(i, { ...project, description: v })}
              rows={4}
            />
          </Field>
          <Field label="Highlights">
            <StringList
              values={project.highlights ?? []}
              onChange={(v) => ops.set(i, { ...project, highlights: v })}
            />
          </Field>
          <Toggle
            checked={Boolean(project.x_featured)}
            onChange={(v) => ops.set(i, { ...project, x_featured: v })}
            label="Featured (renders as a full-width card)"
          />
          <Field label="Tech">
            <TechPicker
              techKeys={techKeys}
              selected={project.x_tech ?? []}
              onChange={(v) => ops.set(i, { ...project, x_tech: v })}
            />
          </Field>
        </EntryCard>
      ))}
      <Btn onClick={() => ops.add({ ...BLANK })}>+ add project</Btn>
    </div>
  )
}
