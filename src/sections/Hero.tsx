import { useEffect, useState } from 'react'
import { assets, resume } from '../lib/data'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useMediaQuery, DESKTOP_QUERY } from '../hooks/useMediaQuery'
import { ParticleField } from '../components/ParticleField'

/** Types the headline once (not looped); instant under reduced motion. */
function useTypedText(text: string, enabled: boolean) {
  const [length, setLength] = useState(enabled ? 0 : text.length)
  useEffect(() => {
    if (!enabled) {
      setLength(text.length)
      return
    }
    setLength(0)
    let i = 0
    const timer = setInterval(() => {
      i += 1
      setLength(i)
      if (i >= text.length) clearInterval(timer)
    }, 26)
    return () => clearInterval(timer)
  }, [text, enabled])
  return { typed: text.slice(0, length), done: length >= text.length }
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
  const { typed, done } = useTypedText(x_meta.headline, !reduced)
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

          {/* The invisible copy reserves the final layout size, so typing never
              shifts the content below it (CLS). */}
          <p className="relative mt-6 font-mono text-base text-accent sm:text-lg">
            <span className="sr-only">{x_meta.headline}</span>
            <span aria-hidden="true" className="invisible">
              {x_meta.headline}
            </span>
            <span aria-hidden="true" className="absolute inset-0">
              {typed}
              {!reduced && !done ? <span className="caret" /> : null}
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
            <a
              href={`/${__CV_FILENAME__}`}
              download
              className="rounded-md bg-accent px-6 py-3 font-semibold text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
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
