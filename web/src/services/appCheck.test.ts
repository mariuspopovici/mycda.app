// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

const appCheck = vi.hoisted(() => ({ initializeAppCheck: vi.fn(), ReCaptchaEnterpriseProvider: vi.fn() }))
vi.mock('firebase/app-check', () => appCheck)
vi.mock('../firebase', () => ({ app: {}, useEmulators: false }))

// the module keeps whether it started, so each test loads a fresh copy
async function load () {
  vi.resetModules()
  return import('./appCheck')
}

describe('App Check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY', 'site-key')
    localStorage.clear()
  })

  it('starts on the account pages, once', async () => {
    const { startAppCheckFor } = await load()
    startAppCheckFor('/login')
    startAppCheckFor('/signup')
    expect(appCheck.initializeAppCheck).toHaveBeenCalledTimes(1)
  })

  it('stays off the public pages for visitors who never signed in', async () => {
    const { startAppCheckFor } = await load()
    for (const path of ['/', '/guide/getting-started', '/faq', '/rho', '/privacy']) startAppCheckFor(path)
    expect(appCheck.initializeAppCheck).not.toHaveBeenCalled()
  })

  it('starts on any page in a browser that was signed in, until it signs out', async () => {
    let mod = await load()
    mod.rememberSession(true)
    mod = await load()
    mod.startAppCheckFor('/faq')
    expect(appCheck.initializeAppCheck).toHaveBeenCalledTimes(1)

    mod.rememberSession(false)
    mod = await load()
    mod.startAppCheckFor('/faq')
    expect(appCheck.initializeAppCheck).toHaveBeenCalledTimes(1)
  })

  it('does nothing without a site key', async () => {
    vi.stubEnv('VITE_RECAPTCHA_ENTERPRISE_SITE_KEY', '')
    const { startAppCheck } = await load()
    startAppCheck()
    expect(appCheck.initializeAppCheck).not.toHaveBeenCalled()
  })
})
