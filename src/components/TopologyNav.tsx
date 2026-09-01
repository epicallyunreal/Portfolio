import { useEffect, useMemo, useRef, useState } from 'react'
import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationNodeDatum,
} from 'd3-force'
import { resume, sectionCount } from '../lib/data'
import { scrollToSection } from '../lib/scroll'
import { useReducedMotion } from '../hooks/useReducedMotion'
import type { SectionId } from '../lib/types'

const LABELS: Record<SectionId, string> = {
  about: 'About',
  experience: 'Experience',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  awards: 'Awards',
  lab: 'Lab',
  contact: 'Contact',
}

// Edges connect related sections, service-topology style.
const EDGE_CANDIDATES: [SectionId, SectionId][] = [
  ['about', 'experience'],
  ['experience', 'skills'],
  ['experience', 'projects'],
  ['skills', 'projects'],
  ['skills', 'certifications'],
  ['projects', 'awards'],
  ['certifications', 'awards'],
  ['awards', 'contact'],
]

const W = 280
const H = 620
const RING_R = 15
const RING_C = 2 * Math.PI * RING_R

interface GraphNode extends SimulationNodeDatum {
  id: SectionId
  label: string
}

interface GraphLink {
  source: GraphNode
  target: GraphNode
}

/**
 * Runs d3-force once with deterministic initial positions, then freezes the
 * layout — stable across reloads, no jitter between visits.
 */
function useGraphLayout(sections: SectionId[]) {
  return useMemo(() => {
    const rowY = (i: number) => 50 + (i * (H - 100)) / Math.max(1, sections.length - 1)
    // Alternating lanes keep the graph reading as a topology rather than
    // collapsing into a straight line once there are many sections.
    const laneX = (i: number) => W / 2 + (i % 2 === 0 ? -44 : 44)
    const nodes: GraphNode[] = sections.map((id, i) => ({
      id,
      label: LABELS[id],
      x: laneX(i),
      y: rowY(i),
    }))
    const byId = new Map(nodes.map((n) => [n.id, n]))
    const links = EDGE_CANDIDATES.filter(([a, b]) => byId.has(a) && byId.has(b)).map(([a, b]) => ({
      source: a as string,
      target: b as string,
    }))

    const simulation = forceSimulation(nodes)
      .force('charge', forceManyBody().strength(-160))
      .force(
        'link',
        forceLink(links)
          .id((d) => (d as GraphNode).id)
          .distance(70)
          .strength(0.5),
      )
      .force('x', forceX<GraphNode>((d) => laneX(sections.indexOf(d.id))).strength(0.35))
      .force('y', forceY<GraphNode>((d) => rowY(sections.indexOf(d.id))).strength(0.6))
      .force('collide', forceCollide(30))
      .stop()

    for (let i = 0; i < 300; i++) simulation.tick()

    for (const n of nodes) {
      n.x = Math.max(52, Math.min(W - 52, n.x ?? W / 2))
      n.y = Math.max(32, Math.min(H - 32, n.y ?? H / 2))
    }
    return { nodes, links: links as unknown as GraphLink[] }
  }, [sections])
}

interface TopologyNavProps {
  active: string
}

/**
 * Master navigation: a live service-topology graph of the sections. Nodes are
 * sections only — each links to its section heading, and the per-item
 * navigation lives inside each section rather than being mirrored here.
 */
export function TopologyNav({ active }: TopologyNavProps) {
  const reduced = useReducedMotion()
  const sections = resume.x_meta.sectionOrder
  const { nodes, links } = useGraphLayout(sections)
  const [hovered, setHovered] = useState<SectionId | null>(null)
  const linkRefs = useRef<Map<SectionId, Element | null>>(new Map())
  const barRefs = useRef<Map<SectionId, HTMLElement | null>>(new Map())

  // The mobile bar scrolls horizontally, so the active section has to be
  // brought into view as you scroll the page or it drifts off the edge.
  useEffect(() => {
    const el = barRefs.current.get(active as SectionId)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [active])

  const activate = (id: SectionId) => scrollToSection(id, reduced)

  const moveFocus = (from: SectionId, delta: number) => {
    const i = sections.indexOf(from)
    const next = sections[(i + delta + sections.length) % sections.length]
    const el = linkRefs.current.get(next)
    if (el instanceof SVGElement || el instanceof HTMLElement) el.focus()
  }

  const handleKey = (e: React.KeyboardEvent, id: SectionId) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      activate(id)
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      moveFocus(id, 1)
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault()
      moveFocus(id, -1)
    }
  }

  const hoveredNode = hovered ? nodes.find((n) => n.id === hovered) : null

  return (
    <>
      {/* Desktop: fixed left rail */}
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[280px] flex-col items-center justify-center border-r border-line bg-bg/70 backdrop-blur-sm lg:flex">
        <p className="mb-1 font-mono text-xs text-faint" aria-hidden="true">
          ~ topology
        </p>
        <div className="relative">
          <svg
            width={W}
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            role="list"
            aria-label="Site sections"
            className="max-h-[calc(100vh-7rem)]"
          >
            <g>
              {links.map((link, i) => {
                const touchesActive = link.source.id === active || link.target.id === active
                const touchesHover =
                  hovered !== null && (link.source.id === hovered || link.target.id === hovered)
                // Flow is drawn *toward* the active node.
                const from = link.target.id === active ? link.source : link.target
                const to = link.target.id === active ? link.target : link.source
                return (
                  <g key={i}>
                    <line
                      x1={link.source.x}
                      y1={link.source.y}
                      x2={link.target.x}
                      y2={link.target.y}
                      stroke={
                        touchesActive || touchesHover
                          ? 'rgb(var(--c-accent))'
                          : 'rgb(var(--c-line))'
                      }
                      strokeOpacity={touchesActive ? 0.55 : touchesHover ? 0.45 : 1}
                      strokeWidth={1.5}
                      className="transition-[stroke,stroke-opacity] duration-200"
                    />
                    {touchesActive && !reduced ? (
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke="rgb(var(--c-accent2))"
                        strokeWidth={1.5}
                        strokeDasharray="3 12"
                        className="edge-flow"
                      />
                    ) : null}
                  </g>
                )
              })}
            </g>
            {nodes.map((node) => {
              const isActive = node.id === active
              const isHovered = node.id === hovered
              const count = sectionCount(node.id)
              return (
                <a
                  key={node.id}
                  href={`#${node.id}`}
                  role="listitem"
                  aria-label={`${node.label}${count ? ` · ${count}` : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  ref={(el) => linkRefs.current.set(node.id, el)}
                  onClick={(e) => {
                    e.preventDefault()
                    activate(node.id)
                  }}
                  onKeyDown={(e) => handleKey(e, node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(node.id)}
                  onBlur={() => setHovered(null)}
                  className="group cursor-pointer outline-none"
                >
                  <g transform={`translate(${node.x}, ${node.y})`}>
                    <g className={`node-inner ${isActive || isHovered ? 'node-inner-lifted' : ''}`}>
                      {!reduced && isActive ? (
                        <circle
                          r={9}
                          fill="none"
                          stroke="rgb(var(--c-accent))"
                          className="node-pulse"
                        />
                      ) : null}
                      {/* Focus ring for keyboard users */}
                      <circle
                        r={23}
                        fill="none"
                        stroke="rgb(var(--c-ink))"
                        strokeWidth={1.5}
                        className="opacity-0 transition-opacity group-focus-visible:opacity-100"
                      />
                      {/* Progress ring — completes when the node is active */}
                      <circle
                        r={RING_R}
                        fill="none"
                        stroke={isActive ? 'rgb(var(--c-accent))' : 'rgb(var(--c-line))'}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        strokeDashoffset={isActive ? 0 : RING_C * 0.72}
                        transform="rotate(-90)"
                        className="transition-[stroke-dashoffset,stroke] duration-500"
                      />
                      <circle
                        r={6}
                        fill={isActive ? 'rgb(var(--c-accent))' : 'rgb(var(--c-panel))'}
                        stroke={isActive ? 'rgb(var(--c-accent))' : 'rgb(var(--c-muted))'}
                        strokeWidth={1.5}
                        className="transition-[fill,stroke] duration-200"
                      />
                    </g>
                    <text
                      y={34}
                      textAnchor="middle"
                      className="pointer-events-none select-none font-mono"
                      fill={isActive || isHovered ? 'rgb(var(--c-ink))' : 'rgb(var(--c-muted))'}
                      fontSize={11}
                    >
                      {node.label.toLowerCase()}
                    </text>
                  </g>
                </a>
              )
            })}
          </svg>
          {hoveredNode ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute z-50 -translate-x-1/2 whitespace-nowrap rounded border border-line bg-panel px-2.5 py-1 font-mono text-xs text-ink shadow-lg"
              style={{ left: hoveredNode.x ?? 0, top: (hoveredNode.y ?? 0) - 44 }}
            >
              {hoveredNode.label}
              {sectionCount(hoveredNode.id) ? (
                <span className="text-muted"> · {sectionCount(hoveredNode.id)}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Mobile: bottom bar. Seven sections cannot fit legibly across a phone,
          so it scrolls horizontally with full labels rather than truncating
          every one of them to nothing. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <ul
          className="flex snap-x snap-mandatory items-stretch gap-1 overflow-x-auto px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Site sections"
        >
          {sections.map((id) => {
            const isActive = id === active
            return (
              <li
                key={id}
                ref={(el) => barRefs.current.set(id, el)}
                className="shrink-0 snap-center"
              >
                <a
                  href={`#${id}`}
                  aria-label={`${LABELS[id]}${sectionCount(id) ? ` · ${sectionCount(id)}` : ''}`}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={(e) => {
                    e.preventDefault()
                    activate(id)
                  }}
                  className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ink"
                >
                  <span
                    aria-hidden="true"
                    className={`block h-2 w-2 rounded-full border transition-colors ${
                      isActive ? 'border-accent bg-accent' : 'border-muted bg-panel'
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap text-center font-mono text-[11px] ${
                      isActive ? 'text-ink' : 'text-muted'
                    }`}
                  >
                    {LABELS[id].toLowerCase()}
                  </span>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
