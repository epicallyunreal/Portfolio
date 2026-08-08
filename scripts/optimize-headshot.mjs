/**
 * Turns a camera photo into a web-ready headshot: square-cropped, resized,
 * re-encoded as WebP, and — importantly — stripped of ALL metadata.
 *
 * Phone photos carry EXIF: device model, capture timestamp, and often GPS
 * coordinates. `public/` is published verbatim, so that metadata would ship to
 * the open web. Re-encoding through a canvas rebuilds the file from raw pixels,
 * so no EXIF can survive. (sips -Z resizes but preserves EXIF — not enough.)
 *
 *   node scripts/optimize-headshot.mjs <source-image> [outStem] [size]
 *
 * Then point data/assets.json#/images/headshot at the output.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import puppeteer from 'puppeteer'

const [, , sourceArg, outStem = 'headshot', sizeArg = '512'] = process.argv
if (!sourceArg) {
  console.error('usage: node scripts/optimize-headshot.mjs <source-image> [outStem] [size]')
  process.exit(1)
}
const size = Number(sizeArg)
const bytes = readFileSync(sourceArg)
const mime = extname(sourceArg).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
const dataUrl = `data:${mime};base64,${bytes.toString('base64')}`

const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] })
try {
  const page = await browser.newPage()
  await page.setContent('<body></body>')
  const out = await page.evaluate(
    async (src, target) =>
      new Promise((resolve, reject) => {
        const img = new Image()
        img.onerror = () => reject(new Error('could not decode source image'))
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = target
          canvas.height = target
          const ctx = canvas.getContext('2d')
          ctx.imageSmoothingQuality = 'high'
          // Square centre-crop (cover), so non-square sources don't distort.
          const side = Math.min(img.naturalWidth, img.naturalHeight)
          const sx = (img.naturalWidth - side) / 2
          const sy = (img.naturalHeight - side) / 2
          ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target)
          resolve({
            webp: canvas.toDataURL('image/webp', 0.86),
            source: `${img.naturalWidth}x${img.naturalHeight}`,
          })
        }
        img.src = src
      }),
    dataUrl,
    size,
  )

  const write = (dataUri, ext) => {
    const buf = Buffer.from(dataUri.split(',')[1], 'base64')
    const path = join('public/images', `${outStem}.${ext}`)
    writeFileSync(path, buf)
    return { path, kb: (buf.length / 1024).toFixed(1) }
  }
  // WebP only: it is universally supported now, and a second copy of a
  // personal photo published for no reason is worth avoiding.
  const webp = write(out.webp, 'webp')
  console.log(
    `✔ ${basename(sourceArg)} (${out.source}, ${(bytes.length / 1024).toFixed(1)} KB) → ` +
      `${webp.path} (${size}x${size}, ${webp.kb} KB), metadata stripped`,
  )
} finally {
  await browser.close()
}
