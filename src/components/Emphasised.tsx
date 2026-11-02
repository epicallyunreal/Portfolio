import { Fragment, type ReactNode } from 'react'

/**
 * A highlight with its skim points marked in the JSON, **like this**. The
 * markers never reach the page, on the site or in the PDF. `render` lets a
 * caller shape the text between them.
 */
export function Emphasised({
  text,
  className,
  render = (part) => part,
}: {
  text: string
  className?: string
  render?: (part: string) => ReactNode
}) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/).map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className={className}>
            {render(part)}
          </strong>
        ) : (
          <Fragment key={i}>{render(part)}</Fragment>
        ),
      )}
    </>
  )
}
