import { useState } from 'react'
import type { Resume } from '../../src/lib/types'
import { Btn, EntryCard, Field, TextInput } from '../components/Fields'
import { listOps } from '../lib/listOps'
import { TechPicker } from '../components/TechPicker'

type TargetKind = 'work' | 'projects' | 'certificates'

const TARGETS: { kind: TargetKind; heading: string }[] = [
  { kind: 'work', heading: 'Experience' },
  { kind: 'projects', heading: 'Projects' },
  { kind: 'certificates', heading: 'Certifications' },
]

/** Label for one taggable item, plus whether it currently carries the skill. */
function targetsOf(resume: Resume, kind: TargetKind) {
  if (kind === 'work') {
    return (resume.work ?? []).map((w, i) => ({
      index: i,
      label: w.position,
      sub: w.name,
      tech: w.x_tech ?? [],
    }))
  }
  if (kind === 'projects') {
    return (resume.projects ?? []).map((p, i) => ({
      index: i,
      label: p.name,
      sub: '',
      tech: p.x_tech ?? [],
    }))
  }
  return (resume.certificates ?? []).map((c, i) => ({
    index: i,
    label: c.name,
    sub: c.issuer,
    tech: c.x_tech ?? [],
  }))
}

export function SkillsEditor({
  resume,
  update,
  techKeys,
  labelFor,
  removeTech,
}: {
  resume: Resume
  update: (mutate: (draft: Resume) => void) => void
  techKeys: string[]
  labelFor: (key: string) => string
  removeTech: (key: string) => void
}) {
  const groups = resume.skills ?? []
  const allSkillKeys = groups.flatMap((g) => g.keywords)
  const [tagging, setTagging] = useState<string | null>(allSkillKeys[0] ?? null)
  const [tab, setTab] = useState<'groups' | 'tags'>('groups')

  // Registry entries that belong to no group never render on the site — worth
  // surfacing rather than leaving them to rot invisibly in assets.json.
  const groupedKeys = new Set(allSkillKeys)
  const ungrouped = techKeys.filter((key) => !groupedKeys.has(key))

  const ops = listOps(groups, (next) =>
    update((draft) => {
      draft.skills = next
    }),
  )

  /** Add or remove a tech key on one role / project / certification. */
  const toggleTag = (kind: TargetKind, index: number, key: string) =>
    update((draft) => {
      const list =
        kind === 'work' ? draft.work : kind === 'projects' ? draft.projects : draft.certificates
      const item = list?.[index]
      if (!item) return
      const current = item.x_tech ?? []
      item.x_tech = current.includes(key) ? current.filter((k) => k !== key) : [...current, key]
    })

  /**
   * Delete a skill everywhere in one step: the registry entry plus every
   * reference to it. Removing only the registry entry would leave dangling
   * tech keys and fail validation, which is why deletion lives here rather
   * than in the Tech & Images registry.
   */
  const deleteSkill = (key: string) => {
    const groupsUsing = groups.filter((g) => g.keywords.includes(key)).length
    const tagged = TARGETS.reduce(
      (n, t) => n + targetsOf(resume, t.kind).filter((x) => x.tech.includes(key)).length,
      0,
    )
    const ok = window.confirm(
      `Delete “${labelFor(key)}” everywhere?\n\n` +
        `• removed from the tech registry (assets.json)\n` +
        `• removed from ${groupsUsing} skill group${groupsUsing === 1 ? '' : 's'}\n` +
        `• untagged from ${tagged} item${tagged === 1 ? '' : 's'} (roles, projects, certifications)\n\n` +
        'Nothing is written until you save this section.',
    )
    if (!ok) return

    update((draft) => {
      draft.skills = (draft.skills ?? []).map((group) => ({
        ...group,
        keywords: group.keywords.filter((k) => k !== key),
      }))
      const strip = (list?: { x_tech?: string[] }[]) => {
        for (const item of list ?? []) {
          if (item.x_tech) item.x_tech = item.x_tech.filter((k) => k !== key)
        }
      }
      strip(draft.work)
      strip(draft.projects)
      strip(draft.certificates)
    })
    removeTech(key)
    if (tagging === key) setTagging(null)
  }

  return (
    <div className="space-y-6">
      {/* Two tabs: the group cards are long, so tagging gets its own view
          rather than sitting below all of them. */}
      <div className="flex gap-1 border-b border-line">
        {(
          [
            ['groups', `Groups (${groups.length})`],
            ['tags', `Tags (${allSkillKeys.length} skills)`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            aria-current={tab === key ? 'true' : undefined}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
              tab === key
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {ungrouped.length > 0 ? (
        <div className="rounded-lg border border-amber-400/50 bg-amber-400/5 p-4">
          <h2 className="font-mono text-sm uppercase tracking-wider text-amber-300">
            ⚠ {ungrouped.length} skill{ungrouped.length === 1 ? '' : 's'} not in any group
          </h2>
          <p className="mb-3 mt-1 text-xs text-amber-200/70">
            These exist in the tech registry but belong to no group, so they never appear in the
            Skills section of the site. Assign each to a group, or delete it.
          </p>
          <ul className="flex flex-wrap gap-2">
            {ungrouped.map((key) => (
              <li
                key={key}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400/50 bg-panel py-0.5 pl-2.5 pr-1"
              >
                <span className="font-mono text-xs text-amber-200">{labelFor(key)}</span>
                <select
                  aria-label={`Add ${labelFor(key)} to a group`}
                  value=""
                  onChange={(e) => {
                    const index = Number(e.target.value)
                    if (Number.isNaN(index)) return
                    ops.set(index, {
                      ...groups[index],
                      keywords: [...groups[index].keywords, key],
                    })
                  }}
                  className="cursor-pointer rounded border border-line bg-bg px-1 py-0.5 font-mono text-[11px] text-muted outline-none focus:border-accent"
                >
                  <option value="">+ group…</option>
                  {groups.map((group, index) => (
                    <option key={group.name} value={index}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => deleteSkill(key)}
                  aria-label={`Delete ${labelFor(key)} everywhere`}
                  title="Delete this skill everywhere"
                  className="rounded-full px-1.5 py-0.5 text-xs text-amber-200/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className={tab === 'groups' ? '' : 'hidden'}>
        <h2 className="sr-only">Skill groups</h2>
        <p className="mb-3 text-xs text-faint">
          Each keyword must exist in assets.json#/tech — add new tech under “Tech &amp; Images”
          first.
        </p>
        <div className="space-y-4">
          {groups.map((group, i) => (
            <EntryCard
              key={i}
              title={group.name}
              index={i}
              count={groups.length}
              level={3}
              onMove={(d) => ops.move(i, d)}
              onRemove={() => ops.remove(i)}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Group name">
                  <TextInput
                    value={group.name}
                    onChange={(v) => ops.set(i, { ...group, name: v })}
                  />
                </Field>
                <Field label="CV note" hint="Appended after the skill list in the PDF.">
                  <TextInput
                    value={group.x_note ?? ''}
                    onChange={(v) => ops.set(i, { ...group, x_note: v || undefined })}
                  />
                </Field>
              </div>
              <Field
                label="Skills in this group"
                hint="Click a chip to add or remove it from this group; × deletes the skill from the portfolio entirely."
              >
                <TechPicker
                  techKeys={techKeys}
                  selected={group.keywords}
                  onChange={(v) => ops.set(i, { ...group, keywords: v })}
                  labelFor={labelFor}
                  onDelete={deleteSkill}
                />
              </Field>
            </EntryCard>
          ))}
          <Btn onClick={() => ops.add({ name: '', keywords: [] })}>+ add group</Btn>
        </div>
      </div>

      <div className={tab === 'tags' ? '' : 'hidden'}>
        <h2 className="sr-only">Tag skills to entries</h2>
        <p className="mb-3 text-xs text-faint">
          Pick a skill, then tick every role, project and certification that uses it. This is what
          drives the cross-filter on the site — the ticks are written into each entry’s tech list.
        </p>

        <div className="grid gap-4 lg:grid-cols-[260px,1fr]">
          <div className="max-h-[26rem] overflow-y-auto rounded border border-line bg-bg p-2">
            {groups.map((group) => (
              <div key={group.name} className="mb-3">
                <p className="mb-1 px-1 font-mono text-[11px] uppercase tracking-wider text-faint">
                  {group.name}
                </p>
                {group.keywords.map((key) => {
                  const count = TARGETS.reduce(
                    (n, t) =>
                      n + targetsOf(resume, t.kind).filter((x) => x.tech.includes(key)).length,
                    0,
                  )
                  return (
                    <div
                      key={key}
                      className={`group flex items-center rounded transition-colors ${
                        tagging === key ? 'bg-accent/15' : 'hover:bg-panel'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setTagging(key)}
                        className={`flex min-w-0 flex-1 items-center justify-between px-2 py-1.5 text-left text-sm ${
                          tagging === key ? 'text-accent' : 'text-muted group-hover:text-ink'
                        }`}
                      >
                        <span className="truncate">{labelFor(key)}</span>
                        <span className="ml-2 shrink-0 font-mono text-[11px] text-faint">
                          {count}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteSkill(key)}
                        aria-label={`Delete ${labelFor(key)} everywhere`}
                        title="Delete this skill everywhere"
                        className="mr-1 shrink-0 rounded px-1.5 py-1 text-xs text-faint transition-colors hover:bg-red-500/20 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div className="rounded border border-line bg-bg p-4">
            {tagging ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <p className="font-mono text-sm text-accent">tagging: {labelFor(tagging)}</p>
                  <button
                    type="button"
                    onClick={() => deleteSkill(tagging)}
                    className="ml-auto rounded border border-red-500/50 px-2 py-1 font-mono text-xs text-red-300 transition-colors hover:bg-red-500/15"
                  >
                    delete skill
                  </button>
                </div>
                <div className="grid gap-6 md:grid-cols-3">
                  {TARGETS.map(({ kind, heading }) => {
                    const items = targetsOf(resume, kind)
                    return (
                      <div key={kind}>
                        <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-faint">
                          {heading}
                        </h3>
                        {items.length === 0 ? (
                          <p className="text-xs text-faint">none yet</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {items.map((item) => (
                              <li key={item.index}>
                                <label className="flex cursor-pointer items-start gap-2 text-sm text-muted hover:text-ink">
                                  <input
                                    type="checkbox"
                                    className="mt-1 h-3.5 w-3.5 shrink-0 accent-accent"
                                    checked={item.tech.includes(tagging)}
                                    onChange={() => toggleTag(kind, item.index, tagging)}
                                  />
                                  <span>
                                    {item.label}
                                    {item.sub ? (
                                      <span className="block text-xs text-faint">{item.sub}</span>
                                    ) : null}
                                  </span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-faint">Select a skill on the left to tag it.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
