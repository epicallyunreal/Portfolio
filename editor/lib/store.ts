import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import bundledResume from '../../data/resume.json'
import bundledAssets from '../../data/assets.json'
import { EDITOR_SESSION_KEY } from '../../src/lib/editorSession'
import type { Assets, Resume } from '../../src/lib/types'

export type SectionKey =
  | 'header'
  | 'experience'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'awards'
  | 'education'
  | 'meta'
  | 'assets'

export interface SectionDef {
  key: SectionKey
  label: string
  /** Top-level resume.json keys this section owns. */
  resumeKeys: (keyof Resume)[]
  /** True when the section owns the whole of assets.json. */
  ownsAssets?: boolean
  note?: string
}

/**
 * Which slice of the JSON each editor section owns. A sectional save writes
 * only these keys onto the current baseline, so two sections can never clobber
 * each other.
 */
export const SECTIONS: SectionDef[] = [
  { key: 'header', label: 'Header & Contact', resumeKeys: ['basics'] },
  { key: 'experience', label: 'Experience', resumeKeys: ['work'] },
  {
    key: 'skills',
    label: 'Skills & Tags',
    resumeKeys: ['skills', 'work', 'projects', 'certificates'],
    // Deleting a skill has to remove the registry entry and every reference to
    // it in one write, or the save would leave dangling tech keys and fail
    // validation — so this section owns assets.json too.
    ownsAssets: true,
    note: 'Tagging writes tech keys onto roles, projects and certifications, and deleting a skill also removes it from the tech registry — so saving this section writes those arrays and assets.json as well.',
  },
  { key: 'projects', label: 'Projects', resumeKeys: ['projects'] },
  { key: 'certifications', label: 'Certifications', resumeKeys: ['certificates'] },
  { key: 'awards', label: 'Awards', resumeKeys: ['awards'] },
  { key: 'education', label: 'Education & Languages', resumeKeys: ['education', 'languages'] },
  { key: 'meta', label: 'Meta & Sections', resumeKeys: ['x_meta'] },
  { key: 'assets', label: 'Tech & Images', resumeKeys: [], ownsAssets: true },
]

export interface EditorData {
  resume: Resume
  assets: Assets
}

export type DataFile = 'resume.json' | 'assets.json'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

export const stable = (value: unknown): string => JSON.stringify(value, null, 2)

/** Semver bump — always applied to the published version, never compounded. */
export type BumpKind = 'patch' | 'minor' | 'major'
export function bumpVersion(version: string, kind: BumpKind): string {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

interface StoredSession {
  /** Published version this session branched from — detects a redeploy. */
  publishedVersion: string
  saved: EditorData
  draft: EditorData
  /**
   * Whether `saved` has already been exported. Persisted with the session so a
   * reload doesn't re-prompt for a download you already have — that would leave
   * two identically named files with no way to tell which is current.
   */
  downloaded: boolean
}

const readSession = (): StoredSession | null => {
  try {
    const raw = sessionStorage.getItem(EDITOR_SESSION_KEY)
    return raw ? (JSON.parse(raw) as StoredSession) : null
  } catch {
    return null
  }
}

const writeSession = (session: StoredSession) => {
  try {
    sessionStorage.setItem(EDITOR_SESSION_KEY, JSON.stringify(session))
  } catch {
    // quota or private mode — the in-memory session still works
  }
}

export function useEditorStore() {
  /** What is actually committed: the files on disk, or the deployed bundle. */
  const [published, setPublished] = useState<EditorData | null>(null)
  /** The session baseline. A save promotes the draft to this. */
  const [saved, setSaved] = useState<EditorData | null>(null)
  const [draft, setDraft] = useState<EditorData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  // No write endpoint => the deployed editor. Detected rather than compiled in,
  // so `vite preview` of a production build behaves exactly like the live site.
  const [demo, setDemo] = useState(false)
  const [restoredSession, setRestoredSession] = useState(false)
  /** Snapshot of the last state handed over as a download. */
  const [downloadedSignature, setDownloadedSignature] = useState<string | null>(null)
  const hydrated = useRef(false)

  const load = useCallback(async (opts?: { fresh?: boolean }) => {
    try {
      const res = await fetch('/__editor/data')
      if (!res.ok) throw new Error(`data endpoint returned ${res.status}`)
      const data = (await res.json()) as EditorData
      setPublished(clone(data))
      setSaved(clone(data))
      setDraft(clone(data))
      setDemo(false)
      setRestoredSession(false)
      setDownloadedSignature(null)
    } catch {
      // Static hosting: fall back to the data compiled into the bundle.
      const live: EditorData = {
        resume: bundledResume as unknown as Resume,
        assets: bundledAssets as unknown as Assets,
      }
      const publishedVersion = live.resume.x_meta.version
      const session = opts?.fresh ? null : readSession()
      // A session branched from an older deploy would silently reintroduce
      // stale content, so only restore one taken from this exact version.
      const usable = session && session.publishedVersion === publishedVersion

      setPublished(clone(live))
      setSaved(clone(usable ? session.saved : live))
      setDraft(clone(usable ? session.draft : live))
      setDemo(true)
      setRestoredSession(Boolean(usable))
      // Restore the export flag too, so a reload neither loses nor invents the
      // fact that this exact state was already downloaded.
      setDownloadedSignature(usable && session.downloaded ? stable(session.saved) : null)
      if (!usable) {
        try {
          sessionStorage.removeItem(EDITOR_SESSION_KEY)
        } catch {
          /* nothing to clear */
        }
      }
    }
    setLoadError(null)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Mirror the working session into sessionStorage so reloading /edit picks up
  // exactly where it left off. Hosted editor only — locally, saves already go
  // to the real files.
  useEffect(() => {
    if (!demo || !published || !saved || !draft) return
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    writeSession({
      publishedVersion: published.resume.x_meta.version,
      saved,
      draft,
      downloaded: downloadedSignature !== null && downloadedSignature === stable(saved),
    })
    // downloadedSignature is a dependency: clicking Download changes only the
    // flag, not the data, and that flag has to reach storage too.
  }, [demo, published, saved, draft, downloadedSignature])

  const updateResume = useCallback((mutate: (draft: Resume) => void) => {
    setDraft((current) => {
      if (!current) return current
      const next = clone(current)
      mutate(next.resume)
      return next
    })
  }, [])

  const updateAssets = useCallback((mutate: (draft: Assets) => void) => {
    setDraft((current) => {
      if (!current) return current
      const next = clone(current)
      mutate(next.assets)
      return next
    })
  }, [])

  /** Per-section dirty flags, derived by comparing only the owned slices. */
  const dirty = useMemo(() => {
    const map = {} as Record<SectionKey, boolean>
    if (!saved || !draft) return map
    for (const section of SECTIONS) {
      map[section.key] =
        section.resumeKeys.some((key) => stable(draft.resume[key]) !== stable(saved.resume[key])) ||
        (section.ownsAssets === true && stable(draft.assets) !== stable(saved.assets))
    }
    return map
  }, [saved, draft])

  const anyDirty = Object.values(dirty).some(Boolean)

  /**
   * Files that differ from what is committed — always measured against the
   * published baseline, never the previous save. An early save may have
   * touched assets.json while later ones only touched resume.json; both still
   * need downloading.
   */
  const changedFiles = useMemo<DataFile[]>(() => {
    if (!published || !saved) return []
    const files: DataFile[] = []
    if (stable(saved.resume) !== stable(published.resume)) files.push('resume.json')
    if (stable(saved.assets) !== stable(published.assets)) files.push('assets.json')
    return files
  }, [published, saved])

  /** Saved work that has not been handed over as a download yet. */
  const undownloaded = demo && changedFiles.length > 0 && downloadedSignature !== stable(saved)

  /** Always the next version after what is published, however many saves in. */
  const nextVersion = useCallback(
    (kind: BumpKind) => bumpVersion(published?.resume.x_meta.version ?? '0.0.0', kind),
    [published],
  )

  /** The document a sectional save would produce: baseline + this slice. */
  const buildPayload = useCallback(
    (sectionKey: SectionKey, version: string): EditorData | null => {
      if (!saved || !draft) return null
      const section = SECTIONS.find((s) => s.key === sectionKey)
      if (!section) return null
      const payload: EditorData = clone(saved)
      const target = payload.resume as unknown as Record<string, unknown>
      for (const key of section.resumeKeys) target[key] = clone(draft.resume[key])
      if (section.ownsAssets) payload.assets = clone(draft.assets)
      payload.resume.x_meta = { ...payload.resume.x_meta, version }
      return payload
    },
    [saved, draft],
  )

  const commitSaved = useCallback((written: EditorData, alsoPublished: boolean) => {
    setSaved(clone(written))
    // Locally the file on disk just changed, so it becomes the new published
    // baseline. In the hosted editor nothing was written, so it does not —
    // which is what keeps the version at "one after published" all session.
    if (alsoPublished) setPublished(clone(written))
    setDraft((current) =>
      current
        ? {
            ...current,
            resume: {
              ...current.resume,
              x_meta: { ...current.resume.x_meta, version: written.resume.x_meta.version },
            },
          }
        : current,
    )
  }, [])

  const markDownloaded = useCallback(() => {
    setDownloadedSignature(stable(saved))
  }, [saved])

  const revertSection = useCallback(
    (sectionKey: SectionKey) => {
      const section = SECTIONS.find((s) => s.key === sectionKey)
      if (!section || !saved) return
      setDraft((current) => {
        if (!current) return current
        const next = clone(current)
        const target = next.resume as unknown as Record<string, unknown>
        for (const key of section.resumeKeys) target[key] = clone(saved.resume[key])
        if (section.ownsAssets) next.assets = clone(saved.assets)
        return next
      })
    },
    [saved],
  )

  return {
    published,
    saved,
    draft,
    demo,
    restoredSession,
    loadError,
    dirty,
    anyDirty,
    changedFiles,
    undownloaded,
    nextVersion,
    updateResume,
    updateAssets,
    buildPayload,
    commitSaved,
    markDownloaded,
    revertSection,
    reload: load,
  }
}
