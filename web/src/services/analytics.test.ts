// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://mycda.app/"}
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyticsPath, analyticsReferrer } from './analytics'

// the jsdom instance, which vitest's environment exposes as a global
declare const jsdom: { reconfigure (options: { url: string }): void }

const ORIGIN = 'https://mycda.app'

const sdk = vi.hoisted(() => ({
  initializeAnalytics: vi.fn(() => ({})),
  isSupported: vi.fn(async () => true),
  logEvent: vi.fn(),
  setAnalyticsCollectionEnabled: vi.fn(),
  setDefaultEventParameters: vi.fn()
}))
vi.mock('firebase/analytics', () => sdk)
vi.mock('../firebase', () => ({ app: {} }))

describe('analyticsPath', () => {
  it('replaces activity and segment IDs with route patterns', () => {
    expect(analyticsPath('/activity/abc123')).toBe('/activity/:id')
    expect(analyticsPath('/activity/abc123/analysis')).toBe('/activity/:id/analysis')
    expect(analyticsPath('/activity/abc123/analysis/seg9')).toBe('/activity/:id/analysis/:sid')
    expect(analyticsPath('/activity/abc123/cda/seg9')).toBe('/activity/:id/cda/:sid')
  })

  it('leaves other pages alone', () => {
    for (const path of ['/', '/activities', '/guide/tests', '/faq', '/profile']) {
      expect(analyticsPath(path)).toBe(path)
    }
  })
})

describe('analyticsReferrer', () => {
  it('keeps no query string or ID from a page on this site', () => {
    expect(analyticsReferrer(`${ORIGIN}/auth/action?mode=resetPassword&oobCode=SECRET`, ORIGIN)).toBe(`${ORIGIN}/auth/action`)
    expect(analyticsReferrer(`${ORIGIN}/activity/abc123/analysis?name=Lap&mass=80`, ORIGIN)).toBe(`${ORIGIN}/activity/:id/analysis`)
  })

  it('keeps only the origin of another site', () => {
    expect(analyticsReferrer('https://example.com/some/page?q=1', ORIGIN)).toBe('https://example.com')
  })

  it('is empty without a referrer', () => {
    expect(analyticsReferrer('', ORIGIN)).toBe('')
  })
})

describe('trackPageView', () => {
  /** A fresh module, since it remembers the started SDK, the choice and the last location. */
  async function load (measurementId = 'G-TEST') {
    vi.resetModules()
    vi.stubEnv('VITE_FIREBASE_MEASUREMENT_ID', measurementId)
    return import('./analytics')
  }
  const settled = async () => {
    await vi.dynamicImportSettled()
    await new Promise((resolve) => setTimeout(resolve))
  }
  const sent = async () => {
    await settled()
    return sdk.logEvent.mock.calls.map(([, , params]) => (params as { page_location: string }).page_location)
  }
  const accept = () => window.localStorage.setItem('mycda-analytics-consent', 'granted')

  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    window.localStorage.clear()
    jsdom.reconfigure({ url: `${ORIGIN}/` })
  })

  it('reports route patterns from the live site, once per page', async () => {
    accept()
    const { trackPageView } = await load()
    trackPageView('/activity/abc123/analysis/seg9')
    trackPageView('/activity/abc123/analysis/seg9')
    trackPageView('/faq')
    expect(await sent()).toEqual([`${ORIGIN}/activity/:id/analysis/:sid`, `${ORIGIN}/faq`])
    expect(sdk.initializeAnalytics).toHaveBeenCalledOnce()
    expect(sdk.initializeAnalytics).toHaveBeenCalledWith({}, {
      config: expect.objectContaining({ send_page_view: false, page_location: `${ORIGIN}/activity/:id/analysis/:sid` })
    })
  })

  it.each([[undefined], ['denied'], ['nonsense']])('loads nothing with a stored choice of %s', async (stored) => {
    if (stored) window.localStorage.setItem('mycda-analytics-consent', stored)
    const { trackPageView } = await load()
    trackPageView('/faq')
    expect(await sent()).toEqual([])
    expect(sdk.isSupported).not.toHaveBeenCalled()
  })

  it('does not start on an auth action page, whose URL holds a reset code', async () => {
    accept()
    jsdom.reconfigure({ url: `${ORIGIN}/auth/action?mode=resetPassword&oobCode=SECRET` })
    const { trackPageView } = await load()
    trackPageView('/auth/action')
    expect(await sent()).toEqual([])
    expect(sdk.initializeAnalytics).not.toHaveBeenCalled()
  })

  it.each(['http://127.0.0.1:4173/', 'http://localhost:5173/', 'https://mycda-c43c6--preview-abc.web.app/'])('sends nothing from %s', async (url) => {
    accept()
    jsdom.reconfigure({ url })
    const { analyticsOffered, trackPageView } = await load()
    trackPageView('/faq')
    expect(analyticsOffered()).toBe(false)
    expect(await sent()).toEqual([])
    expect(sdk.initializeAnalytics).not.toHaveBeenCalled()
  })

  it('sends nothing without a measurement ID', async () => {
    accept()
    const { analyticsOffered, trackPageView } = await load('')
    trackPageView('/faq')
    expect(analyticsOffered()).toBe(false)
    expect(await sent()).toEqual([])
  })

  it('survives an SDK that fails to start', async () => {
    accept()
    sdk.isSupported.mockRejectedValueOnce(new Error('blocked'))
    const { trackPageView } = await load()
    expect(() => trackPageView('/faq')).not.toThrow()
    expect(await sent()).toEqual([])
  })

  it('reports the current page when the visitor accepts, and remembers the choice', async () => {
    const { getAnalyticsConsent, setAnalyticsConsent, trackPageView } = await load()
    trackPageView('/faq')
    expect(await sent()).toEqual([])
    setAnalyticsConsent('granted')
    expect(await sent()).toEqual([`${ORIGIN}/faq`])
    expect(getAnalyticsConsent()).toBe('granted')
    expect(window.localStorage.getItem('mycda-analytics-consent')).toBe('granted')
  })

  it('stops reporting and removes its cookies when the visitor declines later, and can resume', async () => {
    accept()
    const { setAnalyticsConsent, trackPageView } = await load()
    trackPageView('/faq')
    await settled()
    document.cookie = '_ga=GA1.1.1; path=/'
    document.cookie = '_ga_TEST=GS1.1.1; path=/'
    document.cookie = 'other=kept; path=/'

    setAnalyticsConsent('denied')
    await settled()
    expect(sdk.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), false)
    expect(document.cookie).toBe('other=kept')

    trackPageView('/about')
    expect(await sent()).toEqual([`${ORIGIN}/faq`])

    setAnalyticsConsent('granted')
    expect(await sent()).toEqual([`${ORIGIN}/faq`, `${ORIGIN}/about`])
    expect(sdk.setAnalyticsCollectionEnabled).toHaveBeenLastCalledWith(expect.anything(), true)
  })

  it('honors the choice for the session when storage is blocked', async () => {
    const { getAnalyticsConsent, setAnalyticsConsent } = await load()
    const blocked = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => setAnalyticsConsent('denied')).not.toThrow()
    expect(getAnalyticsConsent()).toBe('denied')
    blocked.mockRestore()
  })
})
