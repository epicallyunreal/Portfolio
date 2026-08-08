/**
 * Field-level diff between the on-disk document and what a save would write,
 * so the confirm dialog shows old vs new rather than "trust me".
 */
export interface DiffEntry {
  path: string
  kind: 'added' | 'removed' | 'changed'
  before?: string
  after?: string
}

const show = (value: unknown): string => {
  if (value === undefined) return '—'
  if (value === null) return 'null'
  if (typeof value === 'string') return value === '' ? '(empty)' : value
  if (Array.isArray(value) || typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const isPrimitiveArray = (value: unknown): value is (string | number | boolean)[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((v) => v !== null && typeof v !== 'object')

const isLeaf = (value: unknown) =>
  value === null || typeof value !== 'object' || (Array.isArray(value) && value.length === 0)

export function diffValues(before: unknown, after: unknown, path = ''): DiffEntry[] {
  if (JSON.stringify(before) === JSON.stringify(after)) return []

  if (before === undefined) return [{ path, kind: 'added', after: show(after) }]
  if (after === undefined) return [{ path, kind: 'removed', before: show(before) }]

  // Lists of plain values (tech keys, section order) diff as sets. Comparing
  // them index-by-index would turn "removed one tag" into a wall of shifted
  // indices, which hides the actual change.
  if (isPrimitiveArray(before) && isPrimitiveArray(after)) {
    const beforeSet = new Set(before.map(String))
    const afterSet = new Set(after.map(String))
    const removed = before.filter((v) => !afterSet.has(String(v)))
    const added = after.filter((v) => !beforeSet.has(String(v)))
    if (removed.length === 0 && added.length === 0) {
      return [{ path, kind: 'changed', before: 'reordered', after: after.join(', ') }]
    }
    const out: DiffEntry[] = []
    if (removed.length > 0) out.push({ path, kind: 'removed', before: removed.join(', ') })
    if (added.length > 0) out.push({ path, kind: 'added', after: added.join(', ') })
    return out
  }

  if (isLeaf(before) || isLeaf(after)) {
    return [{ path, kind: 'changed', before: show(before), after: show(after) }]
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const out: DiffEntry[] = []
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      out.push(...diffValues(before[i], after[i], `${path}[${i}]`))
    }
    return out
  }

  const beforeObj = before as Record<string, unknown>
  const afterObj = after as Record<string, unknown>
  const keys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)])
  const out: DiffEntry[] = []
  for (const key of keys) {
    out.push(...diffValues(beforeObj[key], afterObj[key], path ? `${path}.${key}` : key))
  }
  return out
}
