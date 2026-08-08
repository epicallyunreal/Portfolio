/**
 * Everything about the site's identity is derived from data/resume.json, so a
 * fork only ever edits JSON — no name, URL or filename is written into code,
 * config, or the HTML shell.
 *
 * Shared by vite.config.ts (meta tags, CNAME, sitemap, robots), the PDF build,
 * and the app itself.
 */

/** "Nutan Prabhat" → "Nutan_Prabhat_CV.pdf" */
export function cvFileName(name) {
  const slug =
    String(name ?? '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '') || 'Resume'
  return `${slug}_CV.pdf`
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
