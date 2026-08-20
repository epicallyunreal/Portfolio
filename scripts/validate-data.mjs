/**
 * Validates data/resume.json and data/assets.json against their schemas,
 * then cross-checks referential integrity between the two files.
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
import { validateData } from './lib/validate-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))

const errors = validateData({
  resume: read('data/resume.json'),
  lab: read('data/lab.json'),
  assets: read('data/assets.json'),
  resumeSchema: read('data/schema/resume.schema.json'),
  assetsSchema: read('data/schema/assets.schema.json'),
  labSchema: read('data/schema/lab.schema.json'),
  fileExists: (src) => existsSync(join(root, 'public', src.replace(/^\//, ''))),
})

if (errors.length > 0) {
  console.error(
    `✖ Data validation failed (${errors.length} error${errors.length > 1 ? 's' : ''}):\n`,
  )
  for (const e of errors) console.error(`  • ${e}`)
  process.exit(1)
}

console.log('✔ resume.json, assets.json and lab.json are valid; all tech keys resolve.')
