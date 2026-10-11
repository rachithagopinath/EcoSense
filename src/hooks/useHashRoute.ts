import { useCallback, useEffect, useState } from 'react'

export type RouteId = 'overview' | 'monitoring' | 'alerts' | 'system'

const ROUTES: RouteId[] = ['overview', 'monitoring', 'alerts', 'system']

function parse(hash: string): RouteId {
  const id = hash.replace(/^#\/?/, '') as RouteId
  return ROUTES.includes(id) ? id : 'overview'
}

/** Minimal hash router: supports back/forward and survives a refresh. */
export function useHashRoute(): [RouteId, (r: RouteId) => void] {
  const [route, setRoute] = useState<RouteId>(() => parse(window.location.hash))

  useEffect(() => {
    const onChange = () => setRoute(parse(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  const navigate = useCallback((r: RouteId) => {
    if (parse(window.location.hash) !== r) window.location.hash = `/${r}`
  }, [])

  return [route, navigate]
}
