/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}', './editor/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0f14',
        panel: '#101820',
        raised: '#141e28',
        ink: '#e6edf3',
        muted: '#94a3b1',
        faint: '#7b8a97',
        accent: '#22d3ee',
        accent2: '#34d399',
        line: '#1d2b36',
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
        glow: '0 0 32px rgba(34, 211, 238, 0.16)',
        lift: '0 12px 40px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
}
