import { useState } from 'react'
import { assets, techAsset } from '../lib/data'
import { initials, readableOnDark } from '../lib/monogram'

interface TechLogoProps {
  techKey: string
  size?: number
  /** True when a visible label sits next to the logo, so the mark stays decorative. */
  labelled?: boolean
  className?: string
}

/** Generated initials badge for skills with no logo of their own. */
function Monogram({
  label,
  color,
  size,
  labelled,
  className,
}: {
  label: string
  color: string
  size: number
  labelled: boolean
  className: string
}) {
  const text = initials(label)
  // Keep long initials inside the same box as a logo, so nothing reflows.
  const scale = text.length >= 4 ? 0.26 : text.length === 3 ? 0.32 : text.length === 2 ? 0.4 : 0.5
  return (
    <span
      role={labelled ? undefined : 'img'}
      aria-label={labelled ? undefined : label}
      aria-hidden={labelled ? true : undefined}
      title={labelled ? undefined : label}
      style={{
        width: size,
        height: size,
        color: readableOnDark(color),
        borderColor: `${color}59`,
        backgroundColor: `${color}1f`,
        fontSize: Math.max(7, Math.round(size * scale)),
      }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded border font-mono font-bold leading-none tracking-tight ${className}`}
    >
      {text}
    </span>
  )
}

export function TechLogo({ techKey, size = 20, labelled = false, className = '' }: TechLogoProps) {
  const asset = techAsset(techKey)
  const [failed, setFailed] = useState(false)

  // No source, the shared placeholder, or a broken URL — all mean "no real
  // logo", so draw initials rather than the same generic glyph everywhere.
  const hasLogo = Boolean(asset.src) && asset.src !== assets.defaults.fallback
  if (!hasLogo || failed) {
    return (
      <Monogram
        label={asset.label}
        color={asset.color}
        size={size}
        labelled={labelled}
        className={className}
      />
    )
  }

  return (
    <img
      src={asset.src}
      alt={labelled ? '' : asset.label}
      title={labelled ? undefined : asset.label}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${asset.mono ? 'invert-icon ' : ''}${className}`}
    />
  )
}
