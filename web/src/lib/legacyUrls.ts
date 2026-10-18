/**
 * The legacy app used hash URLs (https://mycda.app/#/activity/abc). Maps them to the new paths so
 * bookmarks and password-reset links keep working; returns undefined for non-legacy hashes.
 */
export function pathFromLegacyHash (hash: string): string | undefined {
  if (!hash.startsWith('#/')) return undefined
  const path = hash.slice(1)
  if (path === '/' || path === '/landing') return '/'
  if (path === '/home' || path.startsWith('/home?')) return '/activities'
  return path
}
