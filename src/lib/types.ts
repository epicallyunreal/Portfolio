// Hand-written mirror of data/schema/*.schema.json.
// If a schema changes, update these types in the same commit — `tsc --noEmit`
// in CI catches components that fall out of sync with the JSON shape.

export type SectionId =
  'about' | 'experience' | 'skills' | 'projects' | 'certifications' | 'awards' | 'lab' | 'contact'

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
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
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
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
}

export interface Award {
  title: string
  awarder: string
  date: string
  summary?: string
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
}

export interface SkillGroup {
  name: string
  keywords: string[]
  /** Free-text suffix for the group's CV line. */
  x_note?: string
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
}

export interface Project {
  name: string
  description: string
  /** Projects sort newest-first on these; undated entries sort last. */
  startDate?: string
  endDate?: string
  /** Source repository. */
  url?: string
  /** Deployed, running instance. */
  x_live?: string
  highlights?: string[]
  x_tech?: string[]
  x_featured?: boolean
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
}

export interface Headline {
  text: string
  /** Substring of `text` lifted as it types. Validation rejects anything not found in `text`. */
  emphasis?: string
}

export interface XMeta {
  /** Semver of the resume content — traceability for which CV revision is being shared. */
  version: string
  /** Hero taglines, cycled by the typewriter. One entry types once and stays. */
  headlines: Headline[]
  /** Headline for the CV header — longer than basics.label, which stays for the website. */
  cvHeadline: string
  /** Print certifications as one comma-separated line on the CV — for a variant that must fit a single page. */
  cvCertsInline?: boolean
  /** Tech key → shorter label, used only when this document is printed. The site keeps assets.json's labels. */
  techLabels?: Record<string, string>
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
  /** false keeps this off the CV PDF; it still renders on the site. */
  x_cv?: boolean
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

export interface LabItem {
  name: string
  /** One line, for the deck nav and the card subtitle. */
  tagline: string
  /** The running thing. */
  url: string
  /** Source, when public. */
  repo?: string
  status?: 'live' | 'wip' | 'archived'
  /** A shot of the running thing; dimensions are required so nothing shifts. */
  image?: { src: string; alt: string; width: number; height: number }
  /** Why it was built. Leads the card — the problem before the feature list. */
  why: string
  features?: string[]
  /** What made it interesting to build, rather than what it does. */
  notes?: string[]
  tech?: string[]
}

export interface Lab {
  version: number
  section: {
    /** DOM id and nav anchor — the CV prints a link to it. */
    id: string
    title: string
    hint?: string
    /** The single line the CV prints; the items themselves never reach it. */
    cvNote?: string
  }
  items: LabItem[]
}
