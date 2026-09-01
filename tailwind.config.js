/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './editor/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Every colour resolves through a CSS variable so the whole palette can
      // be swapped in one place. Values are space-separated RGB channels rather
      // than hex, which is what lets Tailwind's opacity modifiers (`bg-accent/40`)
      // keep working via the <alpha-value> placeholder.
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        panel: 'rgb(var(--c-panel) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        ink: 'rgb(var(--c-ink) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        accent2: 'rgb(var(--c-accent2) / <alpha-value>)',
        line: 'rgb(var(--c-line) / <alpha-value>)',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      maxWidth: {
        content: '72rem',
      },
      boxShadow: {
        glow: '0 0 32px rgb(var(--c-accent) / 0.16)',
        lift: '0 12px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
