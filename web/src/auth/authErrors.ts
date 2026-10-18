// wrong-password and user-not-found share one message so sign-in doesn't reveal which emails have accounts
const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/too-many-requests': 'Too many attempts. Try again later, or reset your password.',
  'auth/email-already-in-use': 'An account with this email address already exists.',
  'auth/weak-password': 'Choose a password with at least 6 characters.',
  'auth/requires-recent-login': 'For your security, sign out and sign in again before making this change.',
  'auth/expired-action-code': 'This link has expired. Request a new one.',
  'auth/invalid-action-code': 'This link is invalid or has already been used.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.'
}

/** A message for a Firebase Auth error that can be shown to the user. */
export function authErrorMessage (error: unknown): string {
  const code = (error as { code?: string })?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  return (error as Error)?.message || 'Something went wrong. Please try again.'
}
