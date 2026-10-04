// Type surface for scripts/lib/site-meta.mjs, imported by app code so the
// CV filename is derived in exactly one place.
declare module '*/scripts/lib/site-meta.mjs' {
  export function cvFileName(name: string): string
  export function resumeFileName(name: string): string
  export function siteOrigin(url: string): string
  export function siteHost(url: string): string
  export function isGithubPagesHost(url: string): boolean
}
