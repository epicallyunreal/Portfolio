import type { Project, Resume } from '../../src/lib/types'
import {
  CvToggle,
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
            <Field label="Repo URL" hint="Source repository. Empty for no repo link.">
              <TextInput
                value={project.url ?? ''}
                onChange={(v) => ops.set(i, { ...project, url: v })}
              />
            </Field>
          </div>
          <Field
            label="Live URL"
            hint="Deployed instance. Shown as a second link, and the one the CV points at."
          >
            <TextInput
              value={project.x_live ?? ''}
              onChange={(v) => ops.set(i, { ...project, x_live: v })}
            />
          </Field>
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
          <CvToggle value={project.x_cv} onChange={(v) => ops.set(i, { ...project, x_cv: v })} />
        </EntryCard>
      ))}
      <Btn onClick={() => ops.add({ ...BLANK })}>+ add project</Btn>
    </div>
  )
}
