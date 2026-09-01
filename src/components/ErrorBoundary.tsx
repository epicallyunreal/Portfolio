import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Catches a render crash and shows a readable panel instead of a blank page.
 *
 * This site renders whatever is in resume.json, and /edit lets a visitor change
 * that JSON and preview it live. Schema validation catches the shapes it knows
 * about, but it cannot catch every value a component might choke on — an empty
 * headlines array once left the hero indexing `lines[-1]`. Without a boundary
 * React unmounts the whole tree on any such throw, and the visitor gets a white
 * screen with no indication that anything is recoverable.
 *
 * Error boundaries have no hook equivalent; a class is the only way.
 */

interface Props {
  children: ReactNode
  /** Names the area that failed, so a section crash doesn't read as a site crash. */
  label?: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the component stack — the message alone rarely identifies the section.
    console.error('Render error caught by boundary:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const where = this.props.label ? ` in ${this.props.label}` : ''
    return (
      <div role="alert" className="section-shell">
        <div className="rounded-lg border border-line bg-panel p-6">
          <h2 className="font-mono text-sm text-accent">Something broke{where}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            The rest of the page is still fine. If you were editing content, the last change is the
            likely cause — undo it and the preview recovers.
          </p>
          {/* The message is useful to whoever is editing and harmless to everyone
              else: it is a client-side render error, not server state. */}
          <pre className="mt-4 overflow-x-auto rounded border border-line bg-bg p-3 font-mono text-xs text-faint">
            {error.message}
          </pre>
        </div>
      </div>
    )
  }
}
