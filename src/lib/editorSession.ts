/**
 * Key and reset for the hosted editor's per-tab working session.
 *
 * Lives in src/ rather than editor/ because the portfolio route needs to clear
 * it, and editor/ may be absent from a checkout.
 */
export const EDITOR_SESSION_KEY = 'portfolio-editor-session'

/**
 * Landing on the portfolio itself starts over: opening the editor afterwards
 * shows the published data, never a stale session from an earlier visit.
 * Reloading /edit directly keeps the session.
 */
export function clearEditorSession() {
  try {
    sessionStorage.removeItem(EDITOR_SESSION_KEY)
  } catch {
    // storage unavailable (private mode, disabled cookies) — nothing to clear
  }
}
