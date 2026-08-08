/**
 * Enforces the total-JS budget from the spec: all shipped JS, gzipped, < 250 KB.
 * Run after `vite build`. Exits 1 if the budget is breached.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_BYTES = 250 * 1024

const dist = 'dist'
const files = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (extname(p) === '.js') files.push(p)
  }
}
walk(dist)

let total = 0
const rows = files
  .map((f) => {
    const gz = gzipSync(readFileSync(f)).length
    total += gz
    return { file: f, gz }
  })
  .sort((a, b) => b.gz - a.gz)

for (const { file, gz } of rows) {
  console.log(`${(gz / 1024).toFixed(1).padStart(8)} KB  ${file}`)
}
console.log(`${'-'.repeat(40)}\n${(total / 1024).toFixed(1).padStart(8)} KB total (gzipped)`)

if (total > BUDGET_BYTES) {
  console.error(
    `\n✖ JS budget breached: ${(total / 1024).toFixed(1)} KB gzipped > ${BUDGET_BYTES / 1024} KB budget`,
  )
  process.exit(1)
}
console.log(`✔ Within the ${BUDGET_BYTES / 1024} KB gzipped JS budget.`)
