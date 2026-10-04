/**
 * Renders the /cv route to a PDF. Two modes, decided by whether any flag is
 * present.
 *
 * Default (no flags): renders two documents and copies both into dist/. This
 * is what CI runs.
 *   data/cv.json     → public/<Name>_CV.pdf      the full document, also the site's data
 *   data/resume.json → public/<Name>_Resume.pdf  the one-page version, planted on the
 *                                                window the same way an alternate
 *                                                dataset is in generate mode
 *
 * Generate (--resume / --assets / --name): renders whichever inputs were
 * given, defaulting the rest to data/cv.json and data/assets.json, and writes
 * to GenerateCV/ at the repo root — never anywhere else. The caller does not
 * choose the destination.
 *
 * How an alternate dataset reaches the page: data/*.json is compiled into the
 * bundle, so the data is planted on the window with evaluateOnNewDocument,
 * which runs before any bundle script. src/lib/data.ts picks it up, but only
 * on the /cv path. Nothing in dist/ is rewritten.
 *
 * Per CV_PDF_Layout_Spec.md the margins come from @page in the print CSS, and
 * the phone number comes only from CV_PHONE (a repo secret in CI), passed as a
 * query parameter — never from committed JSON. Page count is reported, not
 * asserted: the CV legitimately grows and shrinks with the content.
 *
 * Every step is bounded by a timeout and logged. An earlier version spawned
 * `npx vite preview` with its output piped nowhere and no timeouts anywhere —
 * when Chrome stalled on CI the job hung silently for as long as the runner
 * allowed, with nothing in the log to say where. Hence: no child process, and
 * nothing here can wait forever.
 *
 * Requires `npm run build` first. Run locally: `CV_PHONE=+91... npm run build:cv`.
 */
import { createServer } from 'node:http'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize, resolve } from 'node:path'
import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { cvFileName, resumeFileName } from './lib/site-meta.mjs'
import { validateDataDetailed } from './lib/validate-core.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const GENERATE_DIR = join(root, 'GenerateCV')
const PORT = 4173
const STEP_TIMEOUT_MS = 60_000
const MAX_NAME_LENGTH = 100
/** Filename stems only: no separators, no traversal, no spaces. */
const SAFE_NAME = /^[A-Za-z0-9._-]+$/

const EXIT = { OK: 0, VALIDATION: 1, USAGE: 2, RENDER: 3 }

class ExitError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}
const usage = (message) => new ExitError(EXIT.USAGE, message)

const HELP = `Render the CV to PDF.

  npm run build:cv -- [--resume <path>] [--assets <path>] [--name <slug>]

  --resume <path>   Document to render           (default: data/cv.json)
  --assets <path>   Asset registry for labels    (default: data/assets.json)
  --name <slug>     Output filename stem, no extension
                    (default: derived from the résumé's basics.name)
  --help            Show this message

With no flags, writes public/<Name>_CV.pdf from data/cv.json and
public/<Name>_Resume.pdf from data/resume.json, and copies both into dist/ —
the default the site build and CI depend on.

With any flag, reads the given inputs and writes to GenerateCV/<name>.pdf at
the repo root. That directory is emptied at the start of every run, so only
one generated CV exists at a time; copy it out before running again. The
absolute output path is the last line of stdout.

Input paths resolve against the current working directory and are read-only.
Schemas always come from this repo. The phone number comes from CV_PHONE.`

/* ------------------------------------------------------------------ args */

function parseArgs(argv) {
  const opts = { resume: null, assets: null, name: null, help: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      opts.help = true
      continue
    }
    const eq = arg.indexOf('=')
    const key = eq === -1 ? arg : arg.slice(0, eq)
    if (!['--resume', '--assets', '--name'].includes(key)) {
      throw usage(`unknown argument ${JSON.stringify(arg)}\n\n${HELP}`)
    }
    const value = eq === -1 ? argv[++i] : arg.slice(eq + 1)
    if (value === undefined || value.startsWith('--')) {
      throw usage(`${key} needs a value`)
    }
    opts[key.slice(2)] = value
  }
  return opts
}

/** The slug becomes a filename, so it is untrusted until proven otherwise. */
function checkName(raw) {
  const reject = (why) => {
    throw usage(`invalid --name ${JSON.stringify(raw)} — ${why}`)
  }
  if (raw === '') reject('must not be empty')
  if (!SAFE_NAME.test(raw)) reject('only letters, digits, dot, underscore and hyphen are allowed')
  if (raw.startsWith('.')) reject('must not start with a dot')
  if (raw.length > MAX_NAME_LENGTH) reject(`must be at most ${MAX_NAME_LENGTH} characters`)
  if (/\.pdf$/i.test(raw)) reject('drop the extension — .pdf is appended')
  return raw
}

function readJsonInput(flag, path) {
  const abs = resolve(process.cwd(), path)
  if (!existsSync(abs) || !statSync(abs).isFile()) {
    throw usage(`--${flag} file not found: ${abs}`)
  }
  try {
    return JSON.parse(readFileSync(abs, 'utf8'))
  } catch (err) {
    throw usage(`--${flag} is not valid JSON (${abs}): ${err.message}`)
  }
}

/* --------------------------------------------------------------- server */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.pdf': 'application/pdf',
}

// Plain static server over dist/ — no child process, no npx, nothing that can
// block on a pipe. Directory paths resolve to index.html, which is how /cv
// works (the build emits dist/cv/index.html).
function staticServer() {
  return createServer((req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0])
    let file = join(dist, normalize(path).replace(/^(\.\.[/\\])+/, ''))
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.statusCode = 404
      return res.end('not found')
    }
    res.setHeader('Content-Type', MIME[extname(file)] ?? 'application/octet-stream')
    res.end(readFileSync(file))
  })
}

/* ---------------------------------------------------------------- render */

async function renderPdf({ outPath, inject, note }) {
  /** Fail loudly instead of hanging, and say which step it was. */
  const withTimeout = async (label, promise, ms = STEP_TIMEOUT_MS) => {
    let timer
    const started = Date.now()
    try {
      const result = await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s`)), ms)
        }),
      ])
      note(`  ✓ ${label} (${((Date.now() - started) / 1000).toFixed(1)}s)`)
      return result
    } catch (err) {
      console.error(`  ✖ ${label}: ${err.message}`)
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  const phone = process.env.CV_PHONE ?? ''
  const server = staticServer()
  let browser

  try {
    await withTimeout(
      'static server listening',
      new Promise((resolve_, reject) => {
        server.once('error', reject)
        server.listen(PORT, '127.0.0.1', resolve_)
      }),
      15_000,
    )

    browser = await withTimeout(
      'chrome launched',
      puppeteer.launch({
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          // CI runners give containers a tiny /dev/shm; without this Chrome can
          // stall indefinitely instead of erroring.
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        timeout: STEP_TIMEOUT_MS,
      }),
    )

    const page = await browser.newPage()
    page.setDefaultTimeout(STEP_TIMEOUT_MS)
    page.setDefaultNavigationTimeout(STEP_TIMEOUT_MS)
    page.on('pageerror', (err) => console.error(`  ⚠ page error: ${err.message}`))

    if (inject) {
      // Runs before any of the page's own scripts, so the data layer sees it
      // at module init rather than after the first render.
      await page.evaluateOnNewDocument((data) => {
        window.__CV_DATA__ = data
      }, inject)
    }

    const url = `http://127.0.0.1:${PORT}/cv?print=1${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`
    await withTimeout(
      `loaded ${url.replace(/phone=[^&]*/, 'phone=***')}`,
      page.goto(url, { waitUntil: 'networkidle0' }),
    )

    // The self-hosted Carlito must be loaded before printing or metrics shift.
    await withTimeout(
      'fonts ready',
      page.evaluate(() => document.fonts.ready),
      30_000,
    )

    await withTimeout(
      'pdf rendered',
      page.pdf({
        path: outPath,
        preferCSSPageSize: true,
        printBackground: false,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
      }),
    )
  } finally {
    if (browser) await browser.close().catch(() => {})
    server.close()
  }
}

/* ------------------------------------------------------------------ main */

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) {
    console.log(HELP)
    return EXIT.OK
  }

  const generate = opts.resume !== null || opts.assets !== null || opts.name !== null
  // Progress belongs on stderr in generate mode so stdout carries only the
  // output path a caller wants to capture.
  const note = generate ? (...args) => console.error(...args) : (...args) => console.log(...args)

  if (!existsSync(join(dist, 'index.html'))) {
    console.error('✖ dist/index.html not found — run `npm run build` before build:cv.')
    return EXIT.VALIDATION
  }
  if (!process.env.CV_PHONE) {
    console.error('⚠ CV_PHONE is not set — the PDF will omit the phone number.')
  }

  if (!generate) {
    const cv = JSON.parse(readFileSync(join(root, 'data/cv.json'), 'utf8'))
    const onePage = JSON.parse(readFileSync(join(root, 'data/resume.json'), 'utf8'))
    const assets = JSON.parse(readFileSync(join(root, 'data/assets.json'), 'utf8'))
    // The CV is the bundle's own data; the one-page resume is planted on the
    // window, which is the only way an alternate document reaches the page.
    const jobs = [
      { source: 'data/cv.json', doc: cv, outFile: cvFileName(cv.basics.name), inject: null },
      {
        source: 'data/resume.json',
        doc: onePage,
        outFile: resumeFileName(onePage.basics.name),
        inject: { resume: onePage, assets },
      },
    ]
    for (const job of jobs) {
      const outPath = join(root, 'public', job.outFile)
      try {
        await renderPdf({ outPath, inject: job.inject, note })
      } catch {
        return EXIT.RENDER
      }
      const pages = (await PDFDocument.load(readFileSync(outPath))).getPageCount()
      // The deploy artifact is dist/ — carry the PDF into it.
      copyFileSync(outPath, join(dist, job.outFile))
      note(
        `✔ public/${job.outFile} generated from ${job.source} (${pages} pages, v${job.doc.x_meta.version})`,
      )
    }
    return EXIT.OK
  }

  // Argument errors first: cheaper to hit, cheaper to fix, and a bad --name
  // should not be masked by whatever the data happens to say.
  const explicitStem = opts.name === null ? null : checkName(opts.name)

  const resume = readJsonInput('resume', opts.resume ?? 'data/cv.json')
  const assets = readJsonInput('assets', opts.assets ?? 'data/assets.json')

  // Emptied here, before validating rather than just before rendering: any run
  // that gets this far must not be able to leave the previous run's PDF behind
  // for a caller to mistake for its own output. Failure leaves the directory
  // empty, so "no file" and "no success" always mean the same thing.
  mkdirSync(GENERATE_DIR, { recursive: true })
  for (const entry of readdirSync(GENERATE_DIR)) {
    rmSync(join(GENERATE_DIR, entry), { recursive: true, force: true })
  }

  // The caller supplies data, never the contract it is judged against.
  const readRepo = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))

  const errors = validateDataDetailed({
    resume,
    assets,
    resumeSchema: readRepo('data/schema/resume.schema.json'),
    assetsSchema: readRepo('data/schema/assets.schema.json'),
    fileExists: (src) => existsSync(join(root, 'public', src.replace(/^\//, ''))),
  })
  if (errors.length > 0) {
    console.error(`✖ ${errors.length} validation error${errors.length > 1 ? 's' : ''}:\n`)
    for (const e of errors) console.error(`${e.file} → ${e.pointer || '/'}\n  ${e.message}`)
    return EXIT.VALIDATION
  }

  // No --name: follow the résumé being rendered, the same rule default mode
  // uses, so a variant written for someone else is named after them.
  const stem = explicitStem ?? cvFileName(resume.basics.name).replace(/\.pdf$/i, '')
  const outPath = join(GENERATE_DIR, `${stem}.pdf`)

  // Render to scratch first: a half-written PDF never appears in GenerateCV/,
  // so anything found there is a complete document.
  const scratch = mkdtempSync(join(tmpdir(), 'portfolio-cv-'))
  try {
    const scratchPdf = join(scratch, `${stem}.pdf`)
    try {
      await renderPdf({ outPath: scratchPdf, inject: { resume, assets }, note })
    } catch {
      return EXIT.RENDER
    }
    const pages = (await PDFDocument.load(readFileSync(scratchPdf))).getPageCount()
    copyFileSync(scratchPdf, outPath)
    note(`✔ ${pages} pages, v${resume.x_meta?.version ?? '?'}`)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }

  console.log(outPath)
  return EXIT.OK
}

try {
  process.exitCode = await main()
} catch (err) {
  if (err instanceof ExitError) {
    console.error(`✖ ${err.message}`)
    process.exitCode = err.code
  } else {
    console.error(`✖ ${err.stack ?? err.message}`)
    process.exitCode = EXIT.RENDER
  }
}
