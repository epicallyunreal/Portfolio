/**
 * Which PDFs in documents/ can be served as they are.
 *
 * documents/ is committed. It holds the two PDFs the site serves and
 * stamps.json, which records what each one was built from. A PDF built on the
 * owner's machine is the first choice. CI renders one only when it is missing
 * or no longer matches its inputs, then commits it back, so the folder always
 * ends up holding exactly what the site serves.
 *
 * Shared by the PDF build, which acts on the answer, and the validator, which
 * only warns.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cvFileName, resumeFileName } from './site-meta.mjs'

export const DOCUMENTS_DIR = 'documents'
export const STAMPS_FILE = `${DOCUMENTS_DIR}/stamps.json`

/**
 * Besides the document itself, the files that decide what gets printed: the
 * tech labels, the print component and its stylesheet, and the helpers that
 * order and format what they show. A change to any of them makes a PDF stale.
 */
const PRINT_SOURCES = ['data/assets.json', 'src/cv/CvPrint.tsx', 'src/cv/cv.css', 'src/lib/data.ts']

export const sha256 = (data) => createHash('sha256').update(data).digest('hex')

/** The two documents the site serves, and the data file each is printed from. */
export function siteDocuments({ cv, onePage }) {
  return [
    { source: 'data/cv.json', doc: cv, file: cvFileName(cv.basics.name) },
    { source: 'data/resume.json', doc: onePage, file: resumeFileName(onePage.basics.name) },
  ]
}

/** One hash over everything a document is printed from. */
export function inputsHash(root, source) {
  const hash = createHash('sha256')
  for (const rel of [source, ...PRINT_SOURCES]) {
    hash.update(`${rel}\n`).update(readFileSync(join(root, rel)))
  }
  return hash.digest('hex')
}

export function readStamps(root) {
  const path = join(root, STAMPS_FILE)
  if (!existsSync(path)) return {}
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    // An unreadable stamps file vouches for nothing, which is the safe answer.
    return {}
  }
}

/**
 * CV_PHONE for a build on the owner's machine. .env.local is git-ignored, so
 * the number stays out of the JSON the same way the CI secret keeps it out. A
 * value already in the environment wins.
 */
export function loadLocalEnv(root) {
  const path = join(root, '.env.local')
  if (existsSync(path)) process.loadEnvFile(path)
}

/**
 * Why documents/<file> cannot be served as it is, or null when it can.
 *
 * The order is the order of trust. First the file has to be the one its stamp
 * describes, so a PDF swapped in by hand vouches for nothing. Then it has to
 * match the data and the print code as they are now. Then two preferences: a
 * build that has the phone number replaces one that went without, and a build
 * on the owner's machine replaces one CI had to make. CI never replaces a
 * local build that is still current.
 */
export function staleReason({ root, file, source, stamps, phoneAvailable, onCi }) {
  const path = join(root, DOCUMENTS_DIR, file)
  if (!existsSync(path)) return 'is not there'
  const stamp = stamps[file]
  if (!stamp) return 'has no stamp'
  if (stamp.sha256 !== sha256(readFileSync(path))) return 'is not the file its stamp describes'
  if (stamp.inputs !== inputsHash(root, source)) return `is older than ${source} or the print code`
  if (phoneAvailable && !stamp.phone) return 'was built without the phone number'
  if (!onCi && stamp.builtOn !== 'local') return 'was built in CI, and a local build replaces it'
  return null
}
