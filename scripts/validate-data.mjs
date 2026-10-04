/**
 * Validates data/cv.json (the full document, which feeds the site and the CV
 * PDF) and data/resume.json (the one-page version, PDF only) against the
 * shared schema, cross-checks tech keys against data/assets.json, and then
 * checks that the two documents agree on every fact that must not drift:
 * name, contact, employers, titles, dates, education and version. Wording is
 * free to differ; a date is not.
 *
 * Run locally: `npm run validate`. Runs in CI and in the pre-commit hook.
 * Exits 1 with a readable message naming the offending key on any failure.
 *
 * The rules themselves live in scripts/lib/validate-core.mjs, shared with the
 * dev-only editor so it cannot save anything CI would reject.
 */
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadLocalEnv, readStamps, siteDocuments, staleReason } from './lib/pdf-stamps.mjs'
import { validateData, validateFactsAgree } from './lib/validate-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const cv = read('data/cv.json')
const onePage = read('data/resume.json')
const shared = {
  assets: read('data/assets.json'),
  resumeSchema: read('data/schema/resume.schema.json'),
  assetsSchema: read('data/schema/assets.schema.json'),
  fileExists: (src) => existsSync(join(root, 'public', src.replace(/^\//, ''))),
}

const errors = [
  // lab.json only renders on the site, so only the site's document is judged
  // against it.
  ...validateData({
    ...shared,
    resume: cv,
    resumeFile: 'cv.json',
    lab: read('data/lab.json'),
    labSchema: read('data/schema/lab.schema.json'),
  }),
  ...validateData({ ...shared, resume: onePage, resumeFile: 'resume.json' }),
  ...validateFactsAgree({ cv, resume: onePage }),
]

if (errors.length > 0) {
  console.error(
    `✖ Data validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}):\n`,
  )
  for (const e of errors) console.error(`  • ${e}`)
  process.exit(1)
}

console.log(
  '✔ cv.json, resume.json, assets.json and lab.json are valid; all tech keys resolve; the two documents agree on facts.',
)

// A nudge, never a failure: the deploy renders whatever documents/ lacks. It
// is said here, where the pre-commit hook prints it, because a PDF rendered in
// CI is the fallback and the one built on this machine is the plan.
if (!process.env.CI) {
  loadLocalEnv(root)
  const stamps = readStamps(root)
  for (const { source, file } of siteDocuments({ cv, onePage })) {
    const reason = staleReason({
      root,
      file,
      source,
      stamps,
      phoneAvailable: Boolean(process.env.CV_PHONE),
      onCi: false,
    })
    if (reason) {
      console.warn(
        `⚠ documents/${file} ${reason}. Run \`npm run build && npm run build:pdf\` and commit documents/, or the deploy will render it in CI.`,
      )
    }
  }
}
