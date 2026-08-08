/**
 * Prints the /cv route of the built site to public/<Name>_CV.pdf
 * (and into dist/ so the deploy artifact carries it).
 *
 * Per CV_PDF_Layout_Spec.md:
 *  - serves the built dist/ with `vite preview`, prints /cv with Puppeteer;
 *  - waits for document.fonts.ready so Carlito metrics are real;
 *  - margins come from @page in the print CSS, not from Puppeteer;
 *  - the phone number comes only from the CV_PHONE env var (a repo secret in
 *    CI), passed as a query parameter — never from committed JSON.
 *
 * Page count is reported, not asserted: the CV legitimately grows and shrinks
 * with the content in resume.json.
 *
 * Requires `npm run build` first. Run locally: `CV_PHONE=+91... npm run build:pdf`.
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import puppeteer from 'puppeteer'
import { PDFDocument } from 'pdf-lib'
import { cvFileName } from './lib/site-meta.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 4173

if (!existsSync(join(root, 'dist/index.html'))) {
  console.error('✖ dist/index.html not found — run `npm run build` before build:pdf.')
  process.exit(1)
}

const phone = process.env.CV_PHONE ?? ''
if (!phone) {
  console.warn('⚠ CV_PHONE is not set — the PDF will omit the phone number.')
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'pipe',
})

const waitForServer = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/`)
      if (res.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error('vite preview did not become ready')
}

const resume = JSON.parse(readFileSync(join(root, 'data/resume.json'), 'utf8'))
const outFile = cvFileName(resume.basics.name)
const outPath = join(root, 'public', outFile)

try {
  await waitForServer()
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
  try {
    const page = await browser.newPage()
    const url = `http://localhost:${PORT}/cv?print=1${phone ? `&phone=${encodeURIComponent(phone)}` : ''}`
    await page.goto(url, { waitUntil: 'networkidle0' })
    // The self-hosted Carlito must be loaded before printing or metrics shift.
    await page.evaluate(() => document.fonts.ready)
    await page.pdf({
      path: outPath,
      preferCSSPageSize: true,
      printBackground: false,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
  } finally {
    await browser.close()
  }
} finally {
  preview.kill()
}

const pageCount = (await PDFDocument.load(readFileSync(outPath))).getPageCount()

// The deploy artifact is dist/ — carry the PDF into it.
if (existsSync(join(root, 'dist'))) {
  copyFileSync(outPath, join(root, 'dist', outFile))
}
console.log(
  `✔ public/${outFile} generated from data/resume.json (${pageCount} pages, v${resume.x_meta.version})`,
)
