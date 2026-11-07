/**
 * Firebase App Check with reCAPTCHA Enterprise: requests to Auth and AI Logic carry a token showing they
 * come from this app, so Auth can turn away scripts that create accounts with the public API key (ADR-0018).
 *
 * reCAPTCHA loads only where Auth is used: on the account pages, in browsers with a signed-in session,
 * and for the run explainer. Visitors who only read the public pages never load it. Nothing runs under
 * the emulators or without a site key.
 */
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { app, useEmulators } from '../firebase'

const env = import.meta.env
const SITE_KEY: string | undefined = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
const SESSION_KEY = 'mycda-session'

/** Pages that call Auth before anyone is signed in. */
const ACCOUNT_PATHS = ['/login', '/signup', '/reset', '/auth/action']

let started = false

/** Starts App Check once. Auth looks it up on every request, so later requests carry tokens. */
export function startAppCheck () {
  if (started || useEmulators || !SITE_KEY) return
  started = true
  // local development registers a debug token instead (Firebase console → App Check → Manage debug tokens)
  if (env.DEV) (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN || true
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(SITE_KEY), isTokenAutoRefreshEnabled: true })
}

/**
 * Starts App Check if this page can talk to Auth. Call it before Auth's first request: at startup, where
 * Auth may refresh a remembered session straight away, and on every navigation.
 */
export function startAppCheckFor (pathname: string) {
  if (ACCOUNT_PATHS.includes(pathname) || hadSession()) startAppCheck()
}

/** Remembers whether this browser is signed in, so the next visit can start App Check before Auth restores the session. */
export function rememberSession (signedIn: boolean) {
  try {
    if (signedIn) window.localStorage.setItem(SESSION_KEY, '1')
    else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // blocked storage: App Check starts once Auth reports the user instead
  }
}

function hadSession (): boolean {
  try {
    return window.localStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}
