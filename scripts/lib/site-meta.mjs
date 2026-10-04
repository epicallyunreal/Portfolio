/**
 * Everything about the site's identity is derived from data/cv.json, so a
 * fork only ever edits JSON — no name, URL or filename is written into code,
 * config, or the HTML shell.
 *
 * Shared by vite.config.ts (meta tags, CNAME, sitemap, robots), the PDF build,
 * and the app itself.
 */

const nameSlug = (name) =>
  String(name ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '') || 'Resume'

/** "Nutan Prabhat" → "Nutan_Prabhat_CV.pdf" — the full document, from cv.json. */
export function cvFileName(name) {
  return `${nameSlug(name)}_CV.pdf`
}

/** "Nutan Prabhat" → "Nutan_Prabhat_Resume.pdf" — the one-page version, from resume.json. */
export function resumeFileName(name) {
  return `${nameSlug(name)}_Resume.pdf`
}

/** basics.url → "https://example.dev" (no trailing slash) */
export function siteOrigin(url) {
  return String(url ?? '').replace(/\/+$/, '')
}

/** basics.url → "example.dev" — the value GitHub Pages wants in CNAME. */
export function siteHost(url) {
  try {
    return new URL(siteOrigin(url)).host
  } catch {
    return ''
  }
}

/** True for a github.io address, which needs no CNAME file. */
export function isGithubPagesHost(url) {
  return siteHost(url).endsWith('.github.io')
}
