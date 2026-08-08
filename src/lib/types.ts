// Hand-written mirror of data/schema/*.schema.json.
// If a schema changes, update these types in the same commit — `tsc --noEmit`
// in CI catches components that fall out of sync with the JSON shape.

export type SectionId =
  'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'awards' | 'contact'

export interface Profile {
  network: string
  username: string
  url: string
}

export interface Basics {
  name: string
  label: string
  image?: string
  email: string
  phone?: string
  url: string
  summary: string
  location?: { city?: string; countryCode?: string }
  profiles: Profile[]
}

export interface WorkEntry {
  name: string
  position: string
  startDate: string
  endDate?: string | null
  summary?: string
  highlights: string[]
  x_tech?: string[]
}

export interface Certificate {
  name: string
  issuer: string
  date: string
  url?: string
  x_status?: 'in-progress' | 'completed'
  /** Overrides the computed status parenthetical in the CV. */
  x_statusNote?: string
  /** Free-text tail appended after the tech labels in the CV line. */
  x_note?: string
  x_tech?: string[]
}

export interface Award {
  title: string
  awarder: string
  date: string
  summary?: string
}

export interface SkillGroup {
  name: string
  keywords: string[]
  /** Free-text suffix for the group's CV line. */
  x_note?: string
}

export interface Project {
  name: string
  description: string
  url?: string
  highlights?: string[]
  x_tech?: string[]
  x_featured?: boolean
}

export interface XMeta {
  /** Semver of the resume content — traceability for which CV revision is being shared. */
  version: string
  headline: string
  /** Headline for the CV header — longer than basics.label, which stays for the website. */
  cvHeadline: string
  availability: string
  careerStart?: string
  sectionOrder: SectionId[]
}

export interface EducationEntry {
  institution: string
  area: string
  studyType: string
  startDate: string
  endDate: string
  score?: string
}

export interface Resume {
  basics: Basics
  work: WorkEntry[]
  education?: EducationEntry[]
  certificates: Certificate[]
  skills: SkillGroup[]
  projects: Project[]
  awards?: Award[]
  languages?: unknown[]
  interests?: unknown[]
  references?: unknown[]
  x_meta: XMeta
}

export interface TechAsset {
  label: string
  src: string
  color: string
  mono?: boolean
}

export interface ImageAsset {
  src: string
  alt: string
  width: number
  height: number
}

export interface Assets {
  version: number
  defaults: { fallback: string }
  tech: Record<string, TechAsset>
  images: Record<string, ImageAsset>
}
