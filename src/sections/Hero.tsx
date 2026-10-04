import { useEffect, useState } from 'react'
import { assets, resume } from '../lib/data'
import { lab } from '../lib/lab'
import { scrollToSection } from '../lib/scroll'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useMediaQuery, DESKTOP_QUERY } from '../hooks/useMediaQuery'
import { ParticleField } from '../components/ParticleField'
import type { Headline } from '../lib/types'

const TYPE_MS = 26
const ERASE_MS = 12
/** How long each headline owns the line, typing and erasing included. */
const CYCLE_MS = 5000
const MIN_HOLD_MS = 900

/**
 * Types one headline at a time and cycles through them: type, hold, erase,
 * next. A single headline types once and stays, which is what the site did
 * before this became a list.
 *
 * Under reduced motion nothing rotates — auto-advancing text is the kind of
 * movement that setting asks us to stop — so the first line is shown outright.
 */
const NO_HEADLINE: Headline = { text: '' }

function useTypedRotation(lines: Headline[], enabled: boolean) {
  const [index, setIndex] = useState(0)
  const [length, setLength] = useState(0)
  const [erasing, setErasing] = useState(false)

  // The list is never empty in valid data — the schema requires one — but the
  // editor's live preview renders the draft mid-edit, including the moment
  // between deleting the last headline and the save that would reject it.
  const line = lines.length > 0 ? lines[Math.min(index, lines.length - 1)] : NO_HEADLINE

  useEffect(() => {
    if (!enabled) return
    const { text } = line

    if (erasing) {
      if (length === 0) {
        setErasing(false)
        setIndex((i) => (i + 1) % lines.length)
        return
      }
      const timer = setTimeout(() => setLength((n) => n - 1), ERASE_MS)
      return () => clearTimeout(timer)
    }

    if (length < text.length) {
      const timer = setTimeout(() => setLength((n) => n + 1), TYPE_MS)
      return () => clearTimeout(timer)
    }

    if (lines.length < 2) return
    // Whatever is left of the 5s after typing and erasing is the hold; a long
    // line gets the floor rather than a negative wait.
    const hold = Math.max(MIN_HOLD_MS, CYCLE_MS - text.length * (TYPE_MS + ERASE_MS))
    const timer = setTimeout(() => setErasing(true), hold)
    return () => clearTimeout(timer)
  }, [enabled, lines, line, length, erasing])

  return enabled ? { line, length } : { line, length: line.text.length }
}

/**
 * The typed prefix, with the emphasised span lifted only as far as it has been
 * typed — so the highlight arrives with the characters rather than ahead of it.
 */
function TypedLine({ line, length }: { line: Headline; length: number }) {
  const start = line.emphasis ? line.text.indexOf(line.emphasis) : -1
  if (start < 0) return <>{line.text.slice(0, length)}</>
  const end = start + (line.emphasis?.length ?? 0)
  return (
    <>
      {line.text.slice(0, Math.min(length, start))}
      <span className="headline-emphasis font-semibold text-ink">
        {line.text.slice(start, Math.min(length, end))}
      </span>
      {length > end ? line.text.slice(end, length) : null}
    </>
  )
}

/**
 * Per-character entrance stagger, CSS-only so no animation library rides in the
 * entry bundle. Words are kept whole so lines only break at word boundaries.
 */
function StaggeredName({ name, reduced }: { name: string; reduced: boolean }) {
  const words = name.split(' ')
  return (
    <>
      {words.map((word, w) => {
        const charOffset = words.slice(0, w).reduce((n, prev) => n + prev.length + 1, 0)
        return (
          // The separating space lives *between* the inline-block word spans —
          // a trailing space inside one would be collapsed away.
          <span key={w} aria-hidden="true">
            {w > 0 ? ' ' : null}
            <span className="inline-block whitespace-nowrap">
              {word.split('').map((char, i) =>
                reduced ? (
                  <span key={i}>{char}</span>
                ) : (
                  <span
                    key={i}
                    className="char-in inline-block"
                    style={{ animationDelay: `${(charOffset + i) * 40}ms` }}
                  >
                    {char}
                  </span>
                ),
              )}
            </span>
          </span>
        )
      })}
    </>
  )
}

export function Hero() {
  const reduced = useReducedMotion()
  const desktop = useMediaQuery(DESKTOP_QUERY)
  const { basics, x_meta } = resume
  const headshot = assets.images.headshot
  const headlines = x_meta.headlines
  const { line, length } = useTypedRotation(headlines, !reduced)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const github = basics.profiles.find((p) => p.network.toLowerCase() === 'github')

  return (
    <div className="relative flex min-h-screen flex-col justify-center overflow-hidden px-6 py-24 sm:px-10 lg:px-16">
      <ParticleField enabled={desktop && !reduced} />

      <div className="relative z-10 mx-auto flex w-full max-w-content flex-col-reverse items-start gap-10 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <h1
            aria-label={basics.name}
            className="text-[clamp(2.5rem,9vw,7rem)] font-black leading-[0.95] tracking-tight text-ink"
          >
            <StaggeredName name={basics.name} reduced={reduced} />
          </h1>

          <p className="mt-4 text-lg font-medium text-muted sm:text-xl">{basics.label}</p>

          {/* Every headline is stacked invisibly in the same grid cell, so the
              box is as large as the longest one ever needs and neither typing
              nor the swap to a longer line shifts the content below (CLS). */}
          <p className="mt-6 grid font-mono text-base text-accent sm:text-lg">
            <span className="sr-only">{headlines.map((h) => h.text).join(' ')}</span>
            {headlines.map((h, i) => (
              <span key={i} aria-hidden="true" className="invisible col-start-1 row-start-1">
                {h.text}
              </span>
            ))}
            <span aria-hidden="true" className="col-start-1 row-start-1">
              <TypedLine line={line} length={length} />
              {reduced ? null : <span className="caret" />}
            </span>
          </p>

          <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 text-sm text-muted">
            <span
              aria-hidden="true"
              className={`h-2 w-2 rounded-full bg-accent2 ${reduced ? '' : 'status-dot'}`}
            />
            {x_meta.availability}
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            {/* Two documents from two data files: the one-page resume for a
                first screen, the full CV for anyone who wants every detail. */}
            <a
              href={`/${__RESUME_FILENAME__}`}
              download
              className="rounded-md bg-accent px-6 py-3 font-semibold text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Download Resume
            </a>
            <a
              href={`/${__CV_FILENAME__}`}
              download
              className="rounded-md border border-line bg-panel px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Download CV
            </a>
            {github ? (
              <a
                href={github.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-line bg-panel px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                GitHub
              </a>
            ) : null}
            {/* A real href, so it can be copied, opened in a tab and reached by
                keyboard; the handler only upgrades the jump to Lenis. */}
            {lab.items.length > 0 ? (
              <a
                href={`#${lab.section.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection(lab.section.id, reduced)
                }}
                className="rounded-md border border-line bg-panel px-6 py-3 font-semibold text-ink transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {lab.section.title}
              </a>
            ) : null}
          </div>
        </div>

        {/* Scale-only entrance: the headshot is the LCP element, so it must
            never start at opacity 0 — that would delay LCP by the fade. */}
        <div className={`hex-frame shrink-0 ${reduced ? '' : 'hex-frame-animated hex-pop'}`}>
          <img
            src={headshot.src}
            alt={headshot.alt}
            width={headshot.width}
            height={headshot.height}
            className="hex-mask h-44 w-44 object-cover sm:h-56 sm:w-56 lg:h-64 lg:w-64"
          />
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`absolute bottom-8 left-1/2 z-10 -translate-x-1/2 font-mono text-xs text-muted transition-opacity duration-500 ${
          scrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span className={reduced ? '' : 'scroll-cue'}>scroll ↓</span>
      </div>
    </div>
  )
}
