import { lazy, Suspense, useMemo, type ComponentType, type LazyExoticComponent } from 'react'
import { resume } from './lib/data'
import { useActiveSection } from './hooks/useActiveSection'
import { useLenis } from './hooks/useLenis'
import { useReducedMotion } from './hooks/useReducedMotion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FilterProvider } from './components/FilterProvider'
import { TopologyNav } from './components/TopologyNav'
import { Hero } from './sections/Hero'
import type { SectionId } from './lib/types'

// Everything below the full-viewport hero is lazy-loaded.
const SECTION_COMPONENTS: Record<SectionId, LazyExoticComponent<ComponentType>> = {
  about: lazy(() => import('./sections/About')),
  experience: lazy(() => import('./sections/Experience')),
  skills: lazy(() => import('./sections/Skills')),
  projects: lazy(() => import('./sections/Projects')),
  certifications: lazy(() => import('./sections/Certifications')),
  awards: lazy(() => import('./sections/Awards')),
  lab: lazy(() => import('./sections/Lab')),
  contact: lazy(() => import('./sections/Contact')),
}

function SectionFallback() {
  return <div className="section-shell min-h-[40vh]" aria-hidden="true" />
}

export default function App() {
  const reduced = useReducedMotion()
  useLenis(!reduced)

  const sections = resume.x_meta.sectionOrder
  const observedIds = useMemo(() => ['hero', ...sections], [sections])
  const active = useActiveSection(observedIds)

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-accent focus:px-4 focus:py-2 focus:font-semibold focus:text-bg"
      >
        Skip to content
      </a>

      <nav aria-label="Section topology">
        <TopologyNav active={active === 'hero' ? sections[0] : active} />
      </nav>

      <div className="lg:pl-[280px]">
        <header id="hero">
          <ErrorBoundary label="the hero">
            <Hero />
          </ErrorBoundary>
        </header>

        <main id="main">
          <FilterProvider>
            {/* One boundary per section: a section that throws is replaced in
                place, and every other section still renders. */}
            {sections.map((id) => {
              const Section = SECTION_COMPONENTS[id]
              return (
                <ErrorBoundary key={id} label={id}>
                  <Suspense fallback={<SectionFallback />}>
                    <Section />
                  </Suspense>
                </ErrorBoundary>
              )
            })}
          </FilterProvider>
        </main>

        <footer className="border-t border-line px-6 pb-28 pt-10 text-center font-mono text-xs text-faint lg:pb-10">
          <p>
            © {new Date().getFullYear()} {resume.basics.name} · fully static · every string on this
            page comes from resume.json{' '}
            <span className="text-accent">v{resume.x_meta.version}</span>
          </p>
          <p className="mt-2">
            built with an in-browser editor —{' '}
            <a
              href="/edit"
              className="text-accent underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              try it here
            </a>
          </p>
        </footer>
      </div>
    </>
  )
}
