import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { FilterContext } from '../hooks/useFilter'

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null)
  const toggle = useCallback(
    (key: string) => setSelected((current) => (current === key ? null : key)),
    [],
  )
  const clear = useCallback(() => setSelected(null), [])
  const value = useMemo(() => ({ selected, toggle, clear }), [selected, toggle, clear])
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
}
