import type { User } from 'firebase/auth'

/**
 * Accounts created from this moment on must verify their email address before using the app.
 * Older accounts were never asked to, and keep working without it.
 */
export const VERIFICATION_REQUIRED_FROM = Date.parse('2026-11-05T00:00:00Z')

/** True when the user has to open the emailed link before seeing signed-in pages. */
export function needsEmailVerification (user: Pick<User, 'emailVerified' | 'metadata'>): boolean {
  if (user.emailVerified) return false
  // an unknown creation time compares false, so the account is treated as an old one
  return Date.parse(user.metadata.creationTime ?? '') >= VERIFICATION_REQUIRED_FROM
}
