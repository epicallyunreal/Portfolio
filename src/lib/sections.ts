import { formatDate, orderedProjects, resume } from './data'
import { lab } from './lab'
import type { SectionId } from './types'

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export interface SectionItem {
  /** DOM anchor id of the detail block. */
  id: string
  label: string
  sub?: string
}

export const workItemId = (index: number) => `exp-${index}-${slugify(resume.work[index].name)}`
export const skillGroupId = (name: string) => `skillgroup-${slugify(name)}`
export const projectItemId = (name: string) => `proj-${slugify(name)}`
export const certItemId = (name: string) => `cert-${slugify(name)}`
export const awardItemId = (title: string) => `award-${slugify(title)}`
export const labItemId = (name: string) => `lab-${slugify(name)}`

/**
 * The per-section item lists, in JSON (chronological) order. Shared by the
 * in-section navigation lists and the master rail's sub-chain.
 */
export function sectionItems(section: SectionId): SectionItem[] {
  switch (section) {
    case 'experience':
      return resume.work.map((w, i) => ({
        id: workItemId(i),
        label: w.position,
        sub: `${w.name} · ${formatDate(w.startDate)} — ${formatDate(w.endDate)}`,
      }))
    case 'skills':
      return resume.skills.map((g) => ({ id: skillGroupId(g.name), label: g.name }))
    case 'projects':
      return orderedProjects().map((p) => ({ id: projectItemId(p.name), label: p.name }))
    case 'certifications':
      return resume.certificates.map((c) => ({
        id: certItemId(c.name),
        label: c.name,
        sub: c.issuer,
      }))
    case 'awards':
      return (resume.awards ?? []).map((a) => ({
        id: awardItemId(a.title),
        label: a.title,
        sub: a.awarder,
      }))
    case 'lab':
      return lab.items.map((item) => ({
        id: labItemId(item.name),
        label: item.name,
        sub: item.status ?? 'live',
      }))
    default:
      return []
  }
}
