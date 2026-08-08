import { useEffect, useState } from 'react'
import { resume } from '../lib/data'
import { Reveal } from '../components/Reveal'
import { SectionHeading } from '../components/SectionHeading'

/**
 * The address is assembled at runtime from parts (it never appears as one
 * string in the served HTML — light scraper obfuscation), but renders in
 * full, large, for humans.
 */
function EmailBlock({ email }: { email: string }) {
  const [address, setAddress] = useState('')
  const [copied, setCopied] = useState(false)
  const [user, domain] = email.split('@')

  useEffect(() => {
    setAddress(`${user}@${domain}`)
  }, [user, domain])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${user}@${domain}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard unavailable — the mailto link still works
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <a
        href={address ? `mailto:${address}` : undefined}
        className="break-all font-mono text-2xl font-bold text-accent underline-offset-8 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent sm:text-4xl lg:text-5xl"
      >
        {address || '…'}
      </a>
      <div className="flex flex-wrap gap-3">
        <a
          href={address ? `mailto:${address}` : undefined}
          className="rounded-md bg-accent px-6 py-3 font-semibold text-bg transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Email me
        </a>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-line bg-panel px-6 py-3 font-semibold text-ink transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {copied ? '✓ copied' : 'Copy address'}
        </button>
      </div>
    </div>
  )
}

export default function Contact() {
  const { basics } = resume

  return (
    <section id="contact" aria-labelledby="contact-heading" className="section-shell">
      <SectionHeading
        id="contact-heading"
        index="07"
        title="Contact"
        hint="No contact form — this site is fully static. Email is the fastest channel."
      />
      <Reveal>
        <div className="flex flex-col items-start gap-10">
          <EmailBlock email={basics.email} />
          <ul className="flex flex-wrap gap-4" aria-label="Profiles">
            {basics.profiles.map((profile) => (
              <li key={profile.network}>
                <a
                  href={profile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-5 py-2.5 font-medium text-ink transition-colors hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  {profile.network}
                  <span className="font-mono text-sm text-muted">@{profile.username}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  )
}
