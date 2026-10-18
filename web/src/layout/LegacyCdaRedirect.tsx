import { Navigate, useParams } from 'react-router'

/** /activity/:id/cda[/:sid] from the legacy app. Unsaved selections lived in memory, so they go back to the activity. */
export function LegacyCdaRedirect () {
  const { id, sid } = useParams()
  return <Navigate to={sid ? `/activity/${id}/analysis/${sid}` : `/activity/${id}`} replace />
}
