import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
}

const MAX_DPR = 1.5
const LINK_DISTANCE = 130

/**
 * Canvas node-field background echoing the topology theme.
 * Mounted only on desktop with motion allowed; paused when the tab is hidden.
 */
export function ParticleField({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!enabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let running = true

    const resize = () => {
      width = canvas.offsetWidth
      height = canvas.offsetHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = Math.min(70, Math.floor((width * height) / 22000))
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
      }))
    }

    const step = () => {
      if (!running) return
      ctx.clearRect(0, 0, width, height)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > width) p.vx *= -1
        if (p.y < 0 || p.y > height) p.vy *= -1
      }
      // Canvas cannot resolve var(), so the palette is read from the document
      // and cached per frame. Falls back to the accent's channels if the
      // property is missing, so the field never renders invisible.
      const accent =
        getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() ||
        '201 162 39'
      ctx.lineWidth = 1
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist < LINK_DISTANCE) {
            ctx.strokeStyle = `rgb(${accent} / ${(0.14 * (1 - dist / LINK_DISTANCE)).toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
      }
      ctx.fillStyle = `rgb(${accent} / 0.55)`
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2)
        ctx.fill()
      }
      frame = requestAnimationFrame(step)
    }

    const onVisibility = () => {
      running = document.visibilityState === 'visible'
      if (running) frame = requestAnimationFrame(step)
      else cancelAnimationFrame(frame)
    }

    resize()
    frame = requestAnimationFrame(step)
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      running = false
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
