import { useState } from 'react'

/**
 * Multi-select over the keys defined in assets.json#/tech.
 *
 * Clicking a chip toggles whether the skill belongs to this group. When
 * `onDelete` is supplied, chips already in the group also carry a × that
 * deletes the skill from the portfolio entirely — two different actions, so
 * they are two separate controls rather than one ambiguous click.
 */
export function TechPicker({
  techKeys,
  selected,
  onChange,
  labelFor,
  onDelete,
}: {
  techKeys: string[]
  selected: string[]
  onChange: (next: string[]) => void
  labelFor?: (key: string) => string
  onDelete?: (key: string) => void
}) {
  const [filter, setFilter] = useState('')
  const label = labelFor ?? ((key: string) => key)
  const visible = techKeys.filter(
    (key) =>
      filter === '' ||
      key.toLowerCase().includes(filter.toLowerCase()) ||
      label(key).toLowerCase().includes(filter.toLowerCase()),
  )

  const toggle = (key: string) =>
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key])

  return (
    <div className="rounded border border-line bg-bg p-3">
      <input
        className="mb-3 w-full rounded border border-line bg-panel px-2 py-1 text-xs text-ink outline-none placeholder:text-faint focus:border-accent"
        placeholder="filter…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
        {visible.map((key) => {
          const on = selected.includes(key)
          return (
            <span
              key={key}
              className={`inline-flex items-center rounded-full border transition-colors ${
                on
                  ? 'border-accent bg-accent/20 text-accent'
                  : 'border-line bg-panel text-muted hover:border-muted hover:text-ink'
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(key)}
                aria-pressed={on}
                title={on ? 'Remove from this group' : 'Add to this group'}
                className="px-2.5 py-1 font-mono text-xs"
              >
                {on ? '✓ ' : ''}
                {label(key)}
              </button>
              {on && onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(key)}
                  aria-label={`Delete ${label(key)} everywhere`}
                  title="Delete this skill everywhere"
                  className="mr-1 rounded-full px-1.5 py-0.5 text-xs text-accent/70 transition-colors hover:bg-red-500/20 hover:text-red-300"
                >
                  ×
                </button>
              ) : null}
            </span>
          )
        })}
        {visible.length === 0 ? <p className="text-xs text-faint">no matching keys</p> : null}
      </div>
      {selected.length > 0 ? (
        <p className="mt-2 font-mono text-xs text-faint">{selected.length} selected</p>
      ) : null}
    </div>
  )
}
