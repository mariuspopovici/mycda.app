import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { pathFromLegacyHash } from '../lib/legacyUrls'

/** Redirects legacy hash URLs (#/activity/…) to their new paths. */
export function LegacyHashRedirect () {
  const navigate = useNavigate()
  useEffect(() => {
    const path = pathFromLegacyHash(window.location.hash)
    if (path) navigate(path, { replace: true })
  }, [navigate])
  return <Outlet />
}
