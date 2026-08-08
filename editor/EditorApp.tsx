import { useCallback, useEffect, useMemo, useState } from 'react'
import App from '../src/App'
import { setPreviewData } from '../src/lib/data'
import { Btn } from './components/Fields'
import { ConfirmSave } from './components/ConfirmSave'
import { SECTIONS, useEditorStore, type EditorData, type SectionKey } from './lib/store'
import { validateDraft } from './lib/validate'
import { HeaderEditor } from './sections/HeaderEditor'
import { ExperienceEditor } from './sections/ExperienceEditor'
import { SkillsEditor } from './sections/SkillsEditor'
import { ProjectsEditor } from './sections/ProjectsEditor'
import { CertificationsEditor } from './sections/CertificationsEditor'
import { AwardsEditor, AssetsEditor, EducationEditor, MetaEditor } from './sections/SimpleEditors'

/**
 * Content editor for data/resume.json and data/assets.json.
 *
 * Runs in two modes, detected at load rather than compiled in:
 *  - `npm run dev` — the dev server exposes a read/write endpoint, so saves
 *    validate through the exact rules CI uses and write the files.
 *  - deployed (static hosting) — no endpoint exists, so it loads the bundled
 *    JSON and runs as a demo: validation and the diff are real, the write is
 *    replaced by a download. There is no write path on the live site.
 */
export default function EditorApp() {
  const store = useEditorStore()
  const { draft, saved, published, demo, dirty, anyDirty, changedFiles, undownloaded } = store
  const [active, setActive] = useState<SectionKey>('header')
  const [preview, setPreview] = useState(false)
  const [confirming, setConfirming] = useState<SectionKey | null>(null)
  const [saving, setSaving] = useState(false)
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [toast, setToast] = useState<string | null>(null)

  // A tool, not content — keep it out of search results (robots.txt disallows
  // it too, but a meta tag survives direct links).
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.appendChild(meta)
    return () => {
      document.head.removeChild(meta)
    }
  }, [])

  // Warn before losing work: either uncommitted section edits, or saved
  // changes that have not been downloaded yet (the hosted editor writes
  // nothing, so a download is the only way out).
  useEffect(() => {
    if (!anyDirty && !undownloaded) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [anyDirty, undownloaded])

  // Live preview renders the real site against the unsaved draft.
  useEffect(() => {
    if (preview && draft) setPreviewData(draft.resume, draft.assets)
  }, [preview, draft])

  const liveErrors = useMemo(() => (draft ? validateDraft(draft) : []), [draft])
  const techKeys = useMemo(() => Object.keys(draft?.assets.tech ?? {}), [draft])
  const groupedKeys = useMemo(
    () => new Set((draft?.resume.skills ?? []).flatMap((group) => group.keywords)),
    [draft],
  )
  const ungroupedCount = techKeys.filter((key) => !groupedKeys.has(key)).length
  const labelFor = useCallback((key: string) => draft?.assets.tech[key]?.label ?? key, [draft])
  const { updateAssets } = store
  const removeTech = useCallback(
    (key: string) =>
      updateAssets((assets) => {
        delete assets.tech[key]
      }),
    [updateAssets],
  )

  /**
   * Hand over the files that differ from what is committed. The set comes from
   * the store, which compares against the published baseline rather than the
   * previous save — so a file changed early in the session still comes along.
   */
  const downloadChanged = () => {
    if (!saved || changedFiles.length === 0) return
    for (const name of changedFiles) {
      const doc = name === 'resume.json' ? saved.resume : saved.assets
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(doc, null, 2) + '\n'], { type: 'application/json' }),
      )
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    }
    store.markDownloaded()
    setToast(`Downloaded ${changedFiles.join(' + ')} — replace them in the repo and push.`)
    setTimeout(() => setToast(null), 7000)
  }

  const doSave = async (payload: EditorData) => {
    // Deployed demo: no write endpoint exists. Everything up to this point —
    // validation and the diff — is real; only the write is simulated.
    if (demo) {
      store.commitSaved(payload, false)
      setConfirming(null)
      setToast(
        `Saved to this session as v${payload.resume.x_meta.version}. ` +
          'Use Download to take the JSON away — nothing is written to the site.',
      )
      setTimeout(() => setToast(null), 8000)
      return
    }
    setSaving(true)
    setServerErrors([])
    try {
      const res = await fetch('/__editor/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok) {
        setServerErrors(body.errors ?? ['save failed'])
        return
      }
      store.commitSaved(payload, true)
      setConfirming(null)
      setToast(`Saved as v${body.version} — commit and push to deploy.`)
      setTimeout(() => setToast(null), 6000)
    } catch (err) {
      setServerErrors([(err as Error).message])
    } finally {
      setSaving(false)
    }
  }

  const switchSection = (key: SectionKey) => {
    if (dirty[active] && key !== active) {
      const ok = window.confirm(
        `“${SECTIONS.find((s) => s.key === active)?.label}” has unsaved changes.\n\nLeave it? The edits stay in the editor until you save or revert them.`,
      )
      if (!ok) return
    }
    setActive(key)
  }

  if (store.loadError) {
    return (
      <main className="mx-auto max-w-2xl p-10 text-ink">
        <h1 className="text-2xl font-bold">Editor unavailable</h1>
        <p className="mt-2 text-muted">{store.loadError}</p>
        <p className="mt-4 text-sm text-faint">
          Run <code>npm run dev</code> to edit the files for real; the deployed build falls back to
          a read-only demo.
        </p>
      </main>
    )
  }
  if (!draft || !saved) {
    return <main className="p-10 font-mono text-sm text-muted">Loading data…</main>
  }

  const activeSection = SECTIONS.find((s) => s.key === active)!
  const dirtyCount = Object.values(dirty).filter(Boolean).length

  return (
    <div className="min-h-screen bg-bg text-ink">
      {/* ---------------------------------------------------------- header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-accent/40 bg-panel">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3">
          <span className="rounded bg-accent px-2 py-1 font-mono text-xs font-bold text-bg">
            EDIT MODE
          </span>
          {demo ? (
            <span
              className="rounded-full border border-amber-400/60 bg-amber-400/10 px-2 py-0.5 font-mono text-xs text-amber-300"
              title="This deployment has no write endpoint. Saving validates, diffs, and downloads the JSON — nothing is written."
            >
              DEMO · changes live in this tab
            </span>
          ) : null}
          <span className="font-mono text-xs text-faint">
            data/resume.json · data/assets.json · v{saved.resume.x_meta.version}
          </span>
          {anyDirty ? (
            <span className="rounded-full border border-amber-400/50 px-2 py-0.5 font-mono text-xs text-amber-300">
              ● {dirtyCount} section{dirtyCount === 1 ? '' : 's'} unsaved
            </span>
          ) : (
            <span className="font-mono text-xs text-accent2">✓ all saved</span>
          )}
          {liveErrors.length > 0 ? (
            <span className="rounded-full border border-red-500/50 px-2 py-0.5 font-mono text-xs text-red-300">
              {liveErrors.length} validation error{liveErrors.length === 1 ? '' : 's'}
            </span>
          ) : null}
          {ungroupedCount > 0 ? (
            <button
              type="button"
              onClick={() => switchSection('skills')}
              title="These skills are in the registry but in no group, so they never render"
              className="rounded-full border border-amber-400/50 px-2 py-0.5 font-mono text-xs text-amber-300 transition-colors hover:bg-amber-400/10"
            >
              ⚠ {ungroupedCount} ungrouped skill{ungroupedCount === 1 ? '' : 's'}
            </button>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Btn onClick={() => setPreview((v) => !v)}>
              {preview ? '← back to editing' : 'Preview site'}
            </Btn>
            <Btn
              onClick={() => {
                // `fresh` skips the stored session — without it Reset would
                // reload the very session it is meant to discard.
                if (
                  undownloaded &&
                  !window.confirm(
                    'Discard this session? Saved changes have not been downloaded and will be lost.',
                  )
                )
                  return
                void store.reload({ fresh: true })
              }}
              disabled={anyDirty}
              title={
                anyDirty
                  ? 'Save or revert your changes first'
                  : demo
                    ? 'Discard everything and start from the published data'
                    : 'Re-read the files from disk'
              }
            >
              {demo ? 'Reset' : 'Reload from disk'}
            </Btn>
            <Btn
              onClick={() => store.revertSection(active)}
              disabled={!dirty[active]}
              variant="danger"
            >
              Revert section
            </Btn>
            {demo ? (
              <Btn
                onClick={downloadChanged}
                disabled={changedFiles.length === 0}
                title={
                  changedFiles.length === 0
                    ? 'Nothing differs from the published data yet'
                    : `Download ${changedFiles.join(' + ')}`
                }
              >
                {undownloaded ? '⬇ Download *' : '⬇ Download'}
                {changedFiles.length > 0 ? ` (${changedFiles.length})` : ''}
              </Btn>
            ) : null}
            <Btn
              variant="primary"
              disabled={!dirty[active] || liveErrors.length > 0}
              onClick={() => {
                setServerErrors([])
                setConfirming(active)
              }}
            >
              Save “{activeSection.label}”
            </Btn>
          </div>
        </div>

        {liveErrors.length > 0 && !preview ? (
          <div className="border-t border-red-500/40 bg-red-500/10 px-4 py-2">
            <ul className="space-y-0.5 text-xs text-red-200">
              {liveErrors.slice(0, 4).map((e) => (
                <li key={e}>• {e}</li>
              ))}
              {liveErrors.length > 4 ? <li>• …and {liveErrors.length - 4} more</li> : null}
            </ul>
          </div>
        ) : null}
      </header>

      {/* --------------------------------------------------------- content */}
      {preview ? (
        <div
          className="pt-16"
          // The CV is generated from committed JSON by CI, so a draft preview
          // must not offer a download that would be stale or missing.
          onClickCapture={(e) => {
            const link = (e.target as HTMLElement).closest('a[download]')
            if (link) {
              e.preventDefault()
              e.stopPropagation()
              setToast(
                'PDF download is disabled in preview — save, commit and push to regenerate it.',
              )
              setTimeout(() => setToast(null), 4000)
            }
          }}
        >
          <div className="border-b border-line bg-raised px-4 py-2 text-center font-mono text-xs text-amber-300">
            preview of unsaved draft · PDF download disabled
          </div>
          <div key={JSON.stringify(draft.resume.x_meta)} className="[&_a[download]]:opacity-40">
            <App />
          </div>
        </div>
      ) : (
        <div className="flex min-h-screen pt-16">
          <nav aria-label="Editor sections" className="w-56 shrink-0 border-r border-line p-3">
            <ul className="space-y-1">
              {SECTIONS.map((section) => (
                <li key={section.key}>
                  <button
                    type="button"
                    onClick={() => switchSection(section.key)}
                    aria-current={active === section.key ? 'true' : undefined}
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm transition-colors ${
                      active === section.key
                        ? 'bg-accent/15 text-accent'
                        : 'text-muted hover:bg-panel hover:text-ink'
                    }`}
                  >
                    <span>{section.label}</span>
                    {dirty[section.key] ? (
                      <span className="ml-2 text-amber-300" title="Unsaved changes">
                        ●
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main className="min-w-0 flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-ink">{activeSection.label}</h1>
              {activeSection.note ? (
                <p className="mt-1 text-sm text-amber-300">{activeSection.note}</p>
              ) : null}
            </div>

            {active === 'header' ? (
              <HeaderEditor resume={draft.resume} update={store.updateResume} />
            ) : null}
            {active === 'experience' ? (
              <ExperienceEditor
                resume={draft.resume}
                update={store.updateResume}
                techKeys={techKeys}
              />
            ) : null}
            {active === 'skills' ? (
              <SkillsEditor
                resume={draft.resume}
                update={store.updateResume}
                techKeys={techKeys}
                labelFor={labelFor}
                removeTech={removeTech}
              />
            ) : null}
            {active === 'projects' ? (
              <ProjectsEditor
                resume={draft.resume}
                update={store.updateResume}
                techKeys={techKeys}
              />
            ) : null}
            {active === 'certifications' ? (
              <CertificationsEditor
                resume={draft.resume}
                update={store.updateResume}
                techKeys={techKeys}
              />
            ) : null}
            {active === 'awards' ? (
              <AwardsEditor resume={draft.resume} update={store.updateResume} />
            ) : null}
            {active === 'education' ? (
              <EducationEditor resume={draft.resume} update={store.updateResume} />
            ) : null}
            {active === 'meta' ? (
              <MetaEditor resume={draft.resume} update={store.updateResume} />
            ) : null}
            {active === 'assets' ? (
              <AssetsEditor
                assets={draft.assets}
                update={store.updateAssets}
                groupedKeys={groupedKeys}
              />
            ) : null}
          </main>
        </div>
      )}

      {confirming ? (
        <ConfirmSave
          sectionLabel={SECTIONS.find((s) => s.key === confirming)!.label}
          note={
            [
              demo
                ? 'Demo: nothing is written. Confirming applies the change in this tab and downloads the JSON.'
                : null,
              SECTIONS.find((s) => s.key === confirming)!.note,
            ]
              .filter(Boolean)
              .join(' ') || undefined
          }
          saved={saved}
          publishedVersion={published?.resume.x_meta.version ?? saved.resume.x_meta.version}
          buildPayload={(version) => store.buildPayload(confirming, version)}
          errorsFor={(payload) => validateDraft(payload)}
          onCancel={() => setConfirming(null)}
          onConfirm={doSave}
          saving={saving}
          serverErrors={serverErrors}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2 rounded border border-accent/60 bg-panel px-4 py-2 text-sm text-ink shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </div>
  )
}
