/** Generic add/reorder/remove helpers for arrays of objects. */
export function listOps<T>(values: T[], onChange: (next: T[]) => void) {
  return {
    set: (index: number, value: T) => {
      const next = [...values]
      next[index] = value
      onChange(next)
    },
    move: (index: number, delta: number) => {
      const target = index + delta
      if (target < 0 || target >= values.length) return
      const next = [...values]
      ;[next[index], next[target]] = [next[target], next[index]]
      onChange(next)
    },
    remove: (index: number) => onChange(values.filter((_, i) => i !== index)),
    add: (blank: T) => onChange([...values, blank]),
  }
}
