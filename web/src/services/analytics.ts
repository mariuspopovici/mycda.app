/**
 * Google Analytics through Firebase, on the live site only and after the visitor accepts: development,
 * preview channels, the emulators and the prerender build send nothing, and neither the SDK nor gtag
 * loads before consent (ADR-0017).
 *
 * Google sees route patterns, never real URLs: query strings hold reset codes (/auth/action?oobCode=…)
 * and rider data (/activity/…/analysis?name=…&mass=…), and paths hold activity IDs. Auth action pages
 * don't start Analytics at all. The SDK and gtag load on the first page view, in their own chunk.
 */
import { app } from '../firebase'
import { SITE_URL } from '../lib/pageMeta'

const MEASUREMENT_ID: string | undefined = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
const CONSENT_KEY = 'mycda-analytics-consent'

/** Whether this is a place Analytics could run, and so whether to ask at all. */
export function analyticsOffered (): boolean {
  return !!MEASUREMENT_ID && window.location.origin === SITE_URL
}

export type AnalyticsConsent = 'granted' | 'denied'

function storedConsent (): AnalyticsConsent | undefined {
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : undefined
  } catch {
    return undefined // blocked storage: ask again next visit, and honor the answer until then
  }
}

let consent: AnalyticsConsent | undefined
let consentRead = false
const listeners = new Set<() => void>()

/** The visitor's choice, undefined until they make one. */
export function getAnalyticsConsent (): AnalyticsConsent | undefined {
  if (!consentRead) {
    consent = storedConsent()
    consentRead = true
  }
  return consent
}

export function subscribeAnalyticsConsent (listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

/** "/activity/abc/analysis/xyz" → "/activity/:id/analysis/:sid". Pure, so it can be tested and reviewed. */
export function analyticsPath (pathname: string): string {
  return pathname
    .replace(/^\/activity\/[^/]+/, '/activity/:id')
    .replace(/^(\/activity\/:id\/(?:analysis|cda))\/[^/]+/, '$1/:sid')
}

/** The referrer Google may see: a route pattern from this site, only the origin from another. */
export function analyticsReferrer (referrer: string, origin: string): string {
  if (!referrer) return ''
  const url = new URL(referrer)
  return url.origin === origin ? origin + analyticsPath(url.pathname) : url.origin
}

interface LoadedAnalytics {
  sendPageView (location: string, title: string): void
  setEnabled (enabled: boolean): void
}

async function loadAnalytics (location: string): Promise<LoadedAnalytics | undefined> {
  const { initializeAnalytics, isSupported, logEvent, setAnalyticsCollectionEnabled, setDefaultEventParameters } = await import('firebase/analytics')
  if (!await isSupported()) return undefined
  const analytics = initializeAnalytics(app, {
    config: {
      // page views are sent below, and every event carries the cleaned location instead of the real one
      send_page_view: false,
      page_location: location,
      page_referrer: analyticsReferrer(document.referrer, window.location.origin),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    }
  })
  return {
    sendPageView (page_location, page_title) {
      setDefaultEventParameters({ page_location })
      logEvent(analytics, 'page_view', { page_location, page_title })
    },
    setEnabled: (enabled) => setAnalyticsCollectionEnabled(analytics, enabled)
  }
}

let loaded: Promise<LoadedAnalytics | undefined> | undefined
let currentPath: string | undefined
let lastLocation: string | undefined

/** Reports a page view, if allowed. Never throws: blocked or unavailable analytics must not affect the app. */
export function trackPageView (pathname: string) {
  currentPath = pathname
  if (!analyticsOffered() || getAnalyticsConsent() !== 'granted' || pathname.startsWith('/auth/')) return
  const location = window.location.origin + analyticsPath(pathname)
  // the analysis page rewrites its query string as the rider works; that isn't a new page
  if (location === lastLocation) return
  lastLocation = location
  const title = document.title
  loaded ??= loadAnalytics(location)
  loaded.then((analytics) => analytics?.sendPageView(location, title)).catch(() => {})
}

/** Google Analytics' own cookies. It sets them on the site's domain, so they're removed from there. */
function deleteAnalyticsCookies () {
  for (const cookie of document.cookie.split('; ')) {
    const name = cookie.split('=')[0]
    if (name === '_ga' || name.startsWith('_ga_')) {
      document.cookie = `${name}=; max-age=0; path=/; domain=${window.location.hostname}`
    }
  }
}

/**
 * Records the visitor's choice. Accepting reports the page they're on; declining stops reporting and
 * removes the cookies straight away, without a reload that could lose work on the analysis page.
 */
export function setAnalyticsConsent (choice: AnalyticsConsent) {
  getAnalyticsConsent()
  consent = choice
  try {
    window.localStorage.setItem(CONSENT_KEY, choice)
  } catch {
    // blocked storage: the choice lasts until the page is closed
  }
  const enable = (enabled: boolean) => loaded?.then((analytics) => analytics?.setEnabled(enabled)).catch(() => {})
  if (choice === 'granted') {
    enable(true)
    if (currentPath) trackPageView(currentPath)
  } else {
    enable(false)
    lastLocation = undefined
    deleteAnalyticsCookies()
  }
  listeners.forEach((listener) => listener())
}
