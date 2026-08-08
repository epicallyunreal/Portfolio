import { useMemo, type ReactNode } from 'react'
import { useActiveSection } from '../hooks/useActiveSection'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { scrollToSection } from '../lib/scroll'
import type { SectionItem } from '../lib/sections'

interface ItemNavProps {
  items: SectionItem[]
  activeId: string
  ariaLabel: string
}

/**
 * The section's own navigation: the items as topology nodes chained in
 * order, echoing the master graph. Scroll-spy drives the active node;
 * clicking one scrolls the details pane to that item.
 */
function ItemNav({ items, activeId, ariaLabel }: ItemNavProps) {
  const reduced = useReducedMotion()
  return (
    <nav
      aria-label={ariaLabel}
      // The aside stretches to the full section height (the grid does not use
      // items-start), so this stays pinned for as long as the section is on
      // screen. max-h keeps long lists scrollable rather than clipped.
      className="sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden pr-2"
    >
      <ol>
        {items.map((item, i) => {
          const isActive = item.id === activeId
          return (
            <li key={item.id} className="relative pl-9">
              {/* edge to the next node */}
              {i < items.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={`absolute bottom-0 left-[10px] top-5 w-px ${
                    isActive && !reduced ? 'chain-flow' : 'bg-line'
                  }`}
                />
              ) : null}
              {/* node: pulse ring + progress ring + core, as in the master graph */}
              <span aria-hidden="true" className="absolute left-0 top-[3px] h-[21px] w-[21px]">
                {isActive && !reduced ? (
                  <span className="node-pulse-ring absolute inset-0 rounded-full border border-accent" />
                ) : null}
                <span
                  className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 ${
                    isActive ? 'border-accent shadow-glow' : 'border-line'
                  }`}
                />
                <span
                  className={`absolute inset-[6px] rounded-full border transition-colors duration-200 ${
                    isActive ? 'border-accent bg-accent' : 'border-muted bg-panel'
                  }`}
                />
              </span>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? 'true' : undefined}
                onClick={(e) => {
                  e.preventDefault()
                  scrollToSection(item.id, reduced)
                }}
                className="group block pb-6 outline-none"
              >
                <span
                  className={`block text-sm font-semibold leading-snug transition-colors group-hover:text-ink group-focus-visible:underline group-focus-visible:decoration-accent group-focus-visible:underline-offset-4 ${
                    isActive ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {item.label}
                </span>
                {item.sub ? (
                  <span className="mt-0.5 block font-mono text-xs text-faint">{item.sub}</span>
                ) : null}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface MasterDetailProps {
  items: SectionItem[]
  ariaLabel: string
  children: ReactNode
}

/**
 * Left/right partition: the item list pinned on the left for as long as the
 * section is in view, details scrolling freely on the right. On mobile the
 * list is hidden and the details stack normally.
 */
export function MasterDetail({ items, ariaLabel, children }: MasterDetailProps) {
  const ids = useMemo(() => items.map((item) => item.id), [items])
  const activeId = useActiveSection(ids)
  return (
    <div className="lg:grid lg:grid-cols-[260px,1fr] lg:gap-12">
      <aside className="hidden lg:block">
        <ItemNav items={items} activeId={activeId} ariaLabel={ariaLabel} />
      </aside>
      <div className="min-w-0 space-y-8">{children}</div>
    </div>
  )
}
