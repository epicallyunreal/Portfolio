import { useEffect, useMemo, useState } from 'react'
import { diffValues } from '../lib/diff'
import { bumpVersion, type BumpKind, type EditorData } from '../lib/store'
import { Btn } from './Fields'

export function ConfirmSave({
  sectionLabel,
  note,
  saved,
  publishedVersion,
  buildPayload,
  errorsFor,
  onCancel,
  onConfirm,
  saving,
  serverErrors,
}: {
  sectionLabel: string
  note?: string
  saved: EditorData
  /** Versions are always the next one after what is committed. */
  publishedVersion: string
  buildPayload: (version: string) => EditorData | null
  errorsFor: (payload: EditorData) => string[]
  onCancel: () => void
  onConfirm: (payload: EditorData) => void
  saving: boolean
  serverErrors: string[]
}) {
  const [bump, setBump] = useState<BumpKind>('patch')
  const nextVersion = bumpVersion(publishedVersion, bump)

  const payload = useMemo(() => buildPayload(nextVersion), [buildPayload, nextVersion])
  const entries = useMemo(
    () =>
      payload ? diffValues(saved, payload).filter((d) => d.path !== 'resume.x_meta.version') : [],
    [saved, payload],
  )
  const errors = useMemo(() => (payload ? errorsFor(payload) : []), [payload, errorsFor])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Confirm save — ${sectionLabel}`}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
    >
      <div className="flex max-h-[85vh] w-full max-w-4xl flex-col rounded-lg border border-line bg-panel">
        <header className="border-b border-line px-5 py-4">
          <h2 className="text-lg font-bold text-ink">Save “{sectionLabel}”</h2>
          <p className="mt-1 font-mono text-xs text-faint">
            v{publishedVersion} → <span className="text-accent">v{nextVersion}</span> ·{' '}
            {entries.length} field{entries.length === 1 ? '' : 's'} changed
          </p>
          {note ? <p className="mt-2 text-xs text-amber-300">{note}</p> : null}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {errors.length > 0 ? (
            <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-red-300">
                Validation failed — cannot save
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {serverErrors.length > 0 ? (
            <div className="mb-4 rounded border border-red-500/50 bg-red-500/10 p-3">
              <p className="mb-1 font-mono text-xs uppercase tracking-wider text-red-300">
                Server rejected the save
              </p>
              <ul className="list-disc space-y-1 pl-5 text-sm text-red-200">
                {serverErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {entries.length === 0 ? (
            <p className="text-sm text-muted">
              No content changes — saving would only bump the version.
            </p>
          ) : (
            <table className="w-full table-fixed border-collapse text-sm">
              <thead>
                <tr className="text-left font-mono text-xs uppercase tracking-wider text-faint">
                  <th className="w-1/3 pb-2">Field</th>
                  <th className="w-1/3 pb-2">Before</th>
                  <th className="w-1/3 pb-2">After</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr key={i} className="border-t border-line align-top">
                    <td className="py-2 pr-3 font-mono text-xs text-muted">
                      <span
                        className={
                          entry.kind === 'added'
                            ? 'text-accent2'
                            : entry.kind === 'removed'
                              ? 'text-red-300'
                              : 'text-accent'
                        }
                      >
                        {entry.kind === 'added' ? '+' : entry.kind === 'removed' ? '−' : '~'}{' '}
                      </span>
                      {entry.path.replace(/^resume\.|^assets\./, (m) => m)}
                    </td>
                    <td className="py-2 pr-3 text-xs text-red-200/80">
                      <span className="line-clamp-4 break-words">{entry.before ?? '—'}</span>
                    </td>
                    <td className="py-2 text-xs text-accent2/90">
                      <span className="line-clamp-4 break-words">{entry.after ?? '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-faint">bump</span>
            {(['patch', 'minor', 'major'] as BumpKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setBump(kind)}
                aria-pressed={bump === kind}
                className={`rounded border px-2 py-1 font-mono text-xs transition-colors ${
                  bump === kind
                    ? 'border-accent bg-accent/20 text-accent'
                    : 'border-line bg-bg text-muted hover:text-ink'
                }`}
              >
                {kind}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Btn onClick={onCancel}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={errors.length > 0 || saving || !payload}
              onClick={() => payload && onConfirm(payload)}
            >
              {saving ? 'Saving…' : `Save as v${nextVersion}`}
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  )
}
