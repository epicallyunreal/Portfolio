/// <reference types="vite/client" />

declare module 'virtual:editor-entry' {
  import type { ComponentType } from 'react'
  // Null in production builds; the editor component under `vite dev`.
  const component: ComponentType | null
  export default component
}

/** CV filename derived from resume.json at build time (see vite.config.ts). */
declare const __CV_FILENAME__: string
