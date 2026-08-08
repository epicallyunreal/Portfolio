import { createContext, useContext } from 'react'

export interface FilterState {
  /** Currently selected tech key (from assets.tech), or null when no filter. */
  selected: string | null
  toggle: (key: string) => void
  clear: () => void
}

export const FilterContext = createContext<FilterState>({
  selected: null,
  toggle: () => {},
  clear: () => {},
})

/** Cross-filter: clicking a skill highlights every Experience/Project entry using it. */
export function useFilter(): FilterState {
  return useContext(FilterContext)
}
