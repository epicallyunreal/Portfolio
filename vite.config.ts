import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { cvFileName, isGithubPagesHost, siteHost, siteOrigin } from './scripts/lib/site-meta.mjs'

const readJson = (rel: string) => JSON.parse(readFileSync(rel, 'utf8'))

const DATA_FILES = {
  resume: 'data/resume.json',
  assets: 'data/assets.json',
} as const

/** Client-side routes that need a real file on GitHub Pages (no rewrites). */
const SPA_ROUTES = ['edit', 'cv']

/**
 * The HTML shell, CNAME, sitemap and robots.txt are all generated from
 * data/resume.json — the site's identity (name, headline, URL) is never
 * written into code or config, so forking is a JSON-only edit.
 */
function siteIdentity(): Plugin {
  return {
    name: 'site-identity',
    transformIndexHtml() {
      const { basics, x_meta } = readJson(DATA_FILES.resume)
      const assets = readJson(DATA_FILES.assets)
      const origin = siteOrigin(basics.url)
      const headshot = assets.images?.headshot
      const og = assets.images?.og

      const tags = [
        { tag: 'title', children: `${basics.name} · ${basics.label}`, injectTo: 'head' as const },
        {
          tag: 'meta',
          attrs: {
            name: 'description',
            content: x_meta.cvHeadline || basics.summary.slice(0, 160),
          },
          injectTo: 'head' as const,
        },
        { tag: 'link', attrs: { rel: 'canonical', href: `${origin}/` }, injectTo: 'head' as const },
        {
          tag: 'meta',
          attrs: { property: 'og:title', content: `${basics.name} · ${basics.label}` },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { property: 'og:description', content: x_meta.headlines[0].text },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { property: 'og:url', content: `${origin}/` },
          injectTo: 'head' as const,
        },
        ...(og
          ? [
              {
                tag: 'meta',
                attrs: { property: 'og:image', content: `${origin}${og.src}` },
                injectTo: 'head' as const,
              },
            ]
          : []),
        // The headshot is the LCP element but lives inside the React tree, so
        // the browser only discovers it after the bundle parses (~1s of load
        // delay, measured). Preloading removes that wait.
        ...(headshot?.src
          ? [
              {
                tag: 'link',
                attrs: {
                  rel: 'preload',
                  as: 'image',
                  href: headshot.src,
                  fetchpriority: 'high',
                },
                injectTo: 'head' as const,
              },
            ]
          : []),
      ]
      return tags
    },
    closeBundle() {
      const { basics } = readJson(DATA_FILES.resume)
      const origin = siteOrigin(basics.url)
      const out = (name: string, body: string) => writeFileSync(join('dist', name), body)

      out(
        'sitemap.xml',
        `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${origin}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n`,
      )
      // /cv and /edit are tools, not content — keep them out of the index.
      out(
        'robots.txt',
        `User-agent: *\nAllow: /\nDisallow: /cv\nDisallow: /edit\n\nSitemap: ${origin}/sitemap.xml\n`,
      )
      // A custom domain needs CNAME; a github.io address must not have one.
      if (!isGithubPagesHost(basics.url)) out('CNAME', `${siteHost(basics.url)}\n`)

      // GitHub Pages has no SPA rewrites, so deep links to client-side routes
      // 404 unless a real file exists at that path.
      for (const route of SPA_ROUTES) {
        const dir = join('dist', route)
        mkdirSync(dir, { recursive: true })
        copyFileSync(join('dist', 'index.html'), join(dir, 'index.html'))
      }
    },
  }
}

/**
 * Resolves `virtual:editor-entry` to the local editor when the folder exists,
 * and to a null stub when it does not — so a checkout without `editor/` still
 * builds. The editor is a separate lazy chunk that only /edit ever loads.
 */
function editorEntry(): Plugin {
  const VIRTUAL = 'virtual:editor-entry'
  const RESOLVED = `\0${VIRTUAL}`
  const ENTRY = 'editor/EditorApp.tsx'

  return {
    name: 'editor-entry',
    resolveId(id) {
      return id === VIRTUAL ? RESOLVED : undefined
    },
    load(id) {
      if (id !== RESOLVED) return undefined
      return existsSync(ENTRY) ? `export { default } from '/${ENTRY}'` : 'export default null'
    },
  }
}

/**
 * Read/write endpoint backing the content editor at /edit.
 *
 * `apply: 'serve'` — it exists only under `npm run dev` on localhost and is
 * never part of a production build, so the deployed site stays fully static
 * with no write path. The deployed editor detects the missing endpoint and
 * runs read-only. Only the two data files can be written, every save is run
 * through the same validator CI uses, and output is Prettier-formatted so
 * `format:check` still passes afterwards.
 */
function editorApi(): Plugin {
  return {
    name: 'editor-api',
    apply: 'serve',
    configureServer(server) {
      const send = (res: import('node:http').ServerResponse, code: number, body: unknown) => {
        res.statusCode = code
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      }

      server.middlewares.use('/__editor/data', (_req, res) => {
        try {
          send(res, 200, {
            resume: readJson(DATA_FILES.resume),
            assets: readJson(DATA_FILES.assets),
          })
        } catch (err) {
          send(res, 500, { errors: [(err as Error).message] })
        }
      })

      server.middlewares.use('/__editor/save', (req, res) => {
        if (req.method !== 'POST') return send(res, 405, { errors: ['POST only'] })
        let raw = ''
        req.on('data', (chunk) => {
          raw += chunk
          if (raw.length > 5_000_000) req.destroy()
        })
        req.on('end', async () => {
          try {
            const { resume, assets } = JSON.parse(raw)
            if (!resume || !assets)
              return send(res, 400, { errors: ['resume and assets required'] })

            const { validateData } = await import('./scripts/lib/validate-core.mjs')
            const errors = validateData({
              resume,
              assets,
              resumeSchema: readJson('data/schema/resume.schema.json'),
              assetsSchema: readJson('data/schema/assets.schema.json'),
              fileExists: (src: string) => existsSync(join('public', src.replace(/^\//, ''))),
            })
            if (errors.length > 0) return send(res, 422, { errors })

            const prettier = await import('prettier')
            const config = (await prettier.resolveConfig('data/resume.json')) ?? {}
            for (const [key, file] of Object.entries(DATA_FILES)) {
              const doc = key === 'resume' ? resume : assets
              const formatted = await prettier.format(JSON.stringify(doc), {
                ...config,
                parser: 'json',
              })
              writeFileSync(file, formatted)
            }
            send(res, 200, { ok: true, version: resume.x_meta?.version })
          } catch (err) {
            send(res, 500, { errors: [(err as Error).message] })
          }
        })
      })
    },
  }
}

export default defineConfig({
  // A custom domain serves at the root. Without one, a project repo would need
  // base: '/<repo-name>/'.
  base: '/',
  plugins: [react(), siteIdentity(), editorEntry(), editorApi()],
  define: {
    // The CV filename is derived from the name in resume.json, so the download
    // link and the generated file can never drift apart.
    __CV_FILENAME__: JSON.stringify(cvFileName(readJson(DATA_FILES.resume).basics.name)),
  },
  build: {
    target: 'es2020',
    sourcemap: false,
  },
})
