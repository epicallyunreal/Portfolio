import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Root from './Root'
import { ErrorBoundary } from './components/ErrorBoundary'
import './styles/index.css'

// Outermost net. App.tsx wraps each section in its own boundary, so this only
// catches a throw in the routing shell itself — but without it, that throw is a
// blank page.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
