import type { ReactNode } from 'react'

const inputClass =
  'w-full rounded border border-line bg-bg px-3 py-2 text-sm text-ink outline-none transition-colors placeholder:text-faint focus:border-accent'

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-xs uppercase tracking-wider text-faint">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-faint">{hint}</span> : null}
    </label>
  )
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <input
      type={type}
      className={inputClass}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      className={`${inputClass} resize-y leading-relaxed`}
      rows={rows}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select className={inputClass} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
      <input
        type="checkbox"
        className="h-4 w-4 accent-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function Btn({
  children,
  onClick,
  variant = 'ghost',
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'ghost' | 'danger'
  disabled?: boolean
  title?: string
  type?: 'button' | 'submit'
}) {
  const styles = {
    primary: 'bg-accent text-bg hover:brightness-110 disabled:bg-line disabled:text-faint',
    ghost: 'border border-line bg-panel text-ink hover:border-accent disabled:text-faint',
    danger: 'border border-red-500/50 bg-panel text-red-300 hover:border-red-400',
  }[variant]
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${styles}`}
    >
      {children}
    </button>
  )
}

/** Editable list of plain strings — bullet highlights, keyword lists. */
export function StringList({
  values,
  onChange,
  placeholder,
  multiline = true,
}: {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  multiline?: boolean
}) {
  const set = (index: number, value: string) => {
    const next = [...values]
    next[index] = value
    onChange(next)
  }
  const move = (index: number, delta: number) => {
    const target = index + delta
    if (target < 0 || target >= values.length) return
    const next = [...values]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {values.map((value, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2 font-mono text-xs text-faint">{i + 1}</span>
          {multiline ? (
            <TextArea
              value={value}
              onChange={(v) => set(i, v)}
              rows={2}
              placeholder={placeholder}
            />
          ) : (
            <TextInput value={value} onChange={(v) => set(i, v)} placeholder={placeholder} />
          )}
          <div className="flex shrink-0 flex-col gap-1">
            <Btn onClick={() => move(i, -1)} title="Move up">
              ↑
            </Btn>
            <Btn onClick={() => move(i, 1)} title="Move down">
              ↓
            </Btn>
            <Btn variant="danger" onClick={() => onChange(values.filter((_, j) => j !== i))}>
              ×
            </Btn>
          </div>
        </div>
      ))}
      <Btn onClick={() => onChange([...values, ''])}>+ add</Btn>
    </div>
  )
}

/** Card wrapper for one entry in a repeatable list, with reorder/remove. */
export function EntryCard({
  title,
  index,
  count,
  onMove,
  onRemove,
  children,
  // Cards directly under the section title are h2; those nested beneath a
  // sub-heading are h3, so heading order never skips a level.
  level = 2,
}: {
  title: string
  index: number
  count: number
  onMove: (delta: number) => void
  onRemove: () => void
  children: ReactNode
  level?: 2 | 3
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <section className="rounded-lg border border-line bg-panel p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <Heading className="font-mono text-sm text-accent">
          [{index}] {title || '(untitled)'}
        </Heading>
        <div className="flex gap-1">
          <Btn onClick={() => onMove(-1)} disabled={index === 0} title="Move up">
            ↑
          </Btn>
          <Btn onClick={() => onMove(1)} disabled={index === count - 1} title="Move down">
            ↓
          </Btn>
          <Btn variant="danger" onClick={onRemove}>
            remove
          </Btn>
        </div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/**
 * The one control for `x_cv`. Phrased as "Show on CV" rather than the raw flag
 * name, and checked by default, because omitted means included — an unchecked
 * box has to be a deliberate act, not the resting state.
 */
export function CvToggle({
  value,
  onChange,
}: {
  value: boolean | undefined
  onChange: (next: boolean | undefined) => void
}) {
  return (
    <Toggle
      checked={value !== false}
      // Dropping the key when it is true keeps the JSON free of noise that
      // restates the default on every entry.
      onChange={(next) => onChange(next ? undefined : false)}
      label="Show on CV (off = site only)"
    />
  )
}
