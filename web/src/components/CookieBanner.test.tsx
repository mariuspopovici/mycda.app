// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://mycda.app/"}
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CookieBanner } from './CookieBanner'

const analytics = vi.hoisted(() => ({
  analyticsOffered: vi.fn(() => true),
  getAnalyticsConsent: vi.fn((): string | undefined => undefined),
  setAnalyticsConsent: vi.fn(),
  subscribeAnalyticsConsent: vi.fn(() => () => {})
}))
vi.mock('../services/analytics', () => analytics)

const renderBanner = (element: ReactElement) =>
  render(<MantineProvider><MemoryRouter>{element}</MemoryRouter></MantineProvider>)

describe('CookieBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    analytics.analyticsOffered.mockReturnValue(true)
    analytics.getAnalyticsConsent.mockReturnValue(undefined)
  })

  it.each([['Accept', 'granted'], ['Decline', 'denied']])('records %s as %s', async (label, choice) => {
    const onClose = vi.fn()
    renderBanner(<CookieBanner settingsOpen={false} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: label }))
    expect(analytics.setAnalyticsConsent).toHaveBeenCalledWith(choice)
    expect(onClose).toHaveBeenCalled()
  })

  it('stays away once the visitor has chosen, until they open the settings', () => {
    analytics.getAnalyticsConsent.mockReturnValue('granted')
    const { rerender } = renderBanner(<CookieBanner settingsOpen={false} onClose={() => {}} />)
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
    rerender(<MantineProvider><MemoryRouter><CookieBanner settingsOpen onClose={() => {}} /></MemoryRouter></MantineProvider>)
    expect(screen.getByRole('region', { name: 'Cookie choice' })).toHaveTextContent('You have accepted.')
  })

  it('does not appear where Analytics cannot run', () => {
    analytics.analyticsOffered.mockReturnValue(false)
    renderBanner(<CookieBanner settingsOpen onClose={() => {}} />)
    expect(screen.queryByRole('region', { name: 'Cookie choice' })).not.toBeInTheDocument()
  })
})
