// Type surface for the shared .mjs validator, imported by editor/lib/validate.ts.
declare module '*/scripts/lib/validate-core.mjs' {
  export function validateData(input: {
    resume: unknown
    assets: unknown
    resumeSchema: unknown
    assetsSchema: unknown
    fileExists?: ((src: string) => boolean) | null
  }): string[]
}
