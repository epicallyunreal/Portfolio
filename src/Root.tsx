import { lazy, Suspense, type ComponentType } from 'react'
import App from './App'
import { clearEditorSession } from './lib/editorSession'

// /cv renders the print-styled CV (Puppeteer prints it to PDF in CI).
// Lazy so the CV chunk and its stylesheet never load on the main site.
const CvPrint = lazy(() => import('./cv/CvPrint'))

function EditorUnavailable() {
  return (
    <main className="mx-auto max-w-2xl p-10 font-mono text-ink">
      <h1 className="text-2xl font-bold">Editor not available</h1>
      <p className="mt-2 text-muted">
        This build has no <code>editor/</code> folder.
      </p>
    </main>
  )
}

/**
 * The content editor at /edit. `virtual:editor-entry` resolves to the editor
 * when the folder is present and to a null stub when it isn't (vite.config.ts),
 * so a checkout without it still builds. It is a separate lazy chunk, so the
 * portfolio never downloads editor code.
 */
const Editor = lazy(async () => {
  const mod = await import('virtual:editor-entry')
  return { default: (mod.default ?? EditorUnavailable) as ComponentType }
})

export default function Root() {
  // GitHub Pages serves /edit from edit/index.html; normalise both forms so
  // the route matches however the file is reached.
  const path = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '')

  if (path === '/cv') {
    return (
      <Suspense fallback={null}>
        <CvPrint />
      </Suspense>
    )
  }

  if (path === '/edit') {
    return (
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    )
  }

  // Reached the portfolio itself: drop any editor session so opening /edit
  // afterwards starts from the published data. The editor's own preview
  // renders <App/> directly and never passes through here, so toggling preview
  // does not wipe your work.
  clearEditorSession()
  return <App />
}
