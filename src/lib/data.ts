// cv.json is the full document (JSON Resume schema) that feeds the site and
// the CV PDF. data/resume.json is the one-page version, printed to a PDF
// only, so the site never imports it.
import resumeJson from '../../data/cv.json'
import assetsJson from '../../data/assets.json'
import type { Assets, Resume, TechAsset } from './types'

// `let` rather than `const` so the dev-only editor at /edit can swap in its
// draft for live preview: ESM exports are live bindings, so every component
// that imported `resume` sees the new value on the next render. Production
// never calls the setter — the values stay exactly the imported JSON.
export let resume = resumeJson as unknown as Resume
export let assets = assetsJson as unknown as Assets

/** Dev-only: point the site at the editor's unsaved draft. */
export function setPreviewData(nextResume: Resume, nextAssets: Assets) {
  resume = nextResume
  assets = nextAssets
}

/**
 * The CV build can render an alternate dataset (`build:cv --resume …`). The
 * data above is compiled into the bundle, so the only way in is to plant it on
 * the window before any bundle script runs — which is what Puppeteer's
 * evaluateOnNewDocument does.
 *
 * Deliberately narrow: only the /cv print route reads it, so the site itself
 * always renders the committed JSON no matter what is on the window. Nothing
 * here is a trust boundary — setting this global already requires running code
 * in the visitor's own browser.
 */
const injected = (globalThis as { __CV_DATA__?: { resume: Resume; assets: Assets } }).__CV_DATA__
if (injected && typeof location !== 'undefined' && location.pathname.startsWith('/cv')) {
  resume = injected.resume
  assets = injected.assets
}

/**
 * Projects newest first, by end date then start date. Derived rather than
 * relying on the order they happen to sit in the file, so adding one is a
 * matter of giving it dates rather than remembering where to paste it.
 *
 * Equal dates fall back to file order, which is how two projects finished in
 * the same month keep a deliberate sequence. Undated entries sort last.
 */
export function orderedProjects(projects: Resume['projects'] = resume.projects) {
  const key = (p: Resume['projects'][number]) => p.endDate ?? p.startDate ?? ''
  return projects
    .map((project, i) => ({ project, i }))
    .sort((a, b) => {
      const byEnd = key(b.project).localeCompare(key(a.project))
      if (byEnd !== 0) return byEnd
      const byStart = (b.project.startDate ?? '').localeCompare(a.project.startDate ?? '')
      return byStart !== 0 ? byStart : a.i - b.i
    })
    .map(({ project }) => project)
}

/**
 * Tech keys render in the order the Skills section lists them — Backend, then
 * AI Integration, then Databases, and so on — rather than in whatever order
 * they happened to be tagged in.
 *
 * Derived from `skills` rather than stored, so re-tagging or reordering a
 * group corrects every role, project and certification at once with no data
 * migration. Keys belonging to no group sort last, keeping their own order.
 */
let orderCache: { skills: Resume['skills']; index: Map<string, number> } | null = null

function techOrderIndex(skills: Resume['skills']): Map<string, number> {
  // Keyed on identity: the editor swaps in a new draft object on every edit,
  // and this must follow it rather than serve a stale order.
  if (!orderCache || orderCache.skills !== skills) {
    orderCache = {
      skills,
      index: new Map(skills.flatMap((group) => group.keywords).map((key, i) => [key, i])),
    }
  }
  return orderCache.index
}

export function orderTech(keys: string[] = [], skills: Resume['skills'] = resume.skills): string[] {
  const index = techOrderIndex(skills)
  // Array.prototype.sort is stable, so unknown keys keep their relative order.
  return [...keys].sort(
    (a, b) => (index.get(a) ?? Number.MAX_SAFE_INTEGER) - (index.get(b) ?? Number.MAX_SAFE_INTEGER),
  )
}

/** Resolve a tech key to its asset entry; unknown keys get the generic fallback. */
export function techAsset(key: string): TechAsset {
  return (
    assets.tech[key] ?? { label: key, src: assets.defaults.fallback, color: '#94a3b1', mono: true }
  )
}

/** '2025-12' → 'Dec 2025' · '2025' → '2025' · null/undefined → 'Present' */
export function formatDate(date: string | null | undefined): string {
  if (!date) return 'Present'
  const [year, month] = date.split('-')
  if (!month) return year
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[Number(month) - 1]} ${year}`
}

/** Stats for the About strip — counted from the JSON, never hardcoded. */
export function siteStats() {
  const starts = resume.work.map((w) => w.startDate)
  if (resume.x_meta.careerStart) starts.push(resume.x_meta.careerStart)
  const earliest = starts.sort()[0]
  let years = 0
  if (earliest) {
    const [y, m = '01'] = earliest.split('-')
    const start = new Date(Number(y), Number(m) - 1)
    years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000))
  }
  return {
    years,
    roles: resume.work.length,
    projects: resume.projects.length,
    certifications: resume.certificates.length,
  }
}

/** Item count shown in the nav tooltip for each section, derived from the JSON. */
export function sectionCount(id: string): string | null {
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`
  switch (id) {
    case 'experience':
      return plural(resume.work.length, 'role')
    case 'skills':
      return plural(
        resume.skills.reduce((n, g) => n + g.keywords.length, 0),
        'skill',
      )
    case 'projects':
      return plural(resume.projects.length, 'project')
    case 'certifications':
      return plural(resume.certificates.length, 'certification')
    case 'awards':
      return plural(resume.awards?.length ?? 0, 'award')
    case 'contact':
      return plural(resume.basics.profiles.length + 1, 'channel')
    default:
      return null
  }
}
