// @vitest-environment jsdom
import type { User } from 'firebase/auth'
import { MemoryRouter, Route, Routes } from 'react-router'
import { MantineProvider } from '@mantine/core'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from './AuthContext'
import { RequireAuth } from './RequireAuth'
import { needsEmailVerification, VERIFICATION_REQUIRED_FROM } from './verification'

const firebaseAuth = vi.hoisted(() => ({ sendEmailVerification: vi.fn(), signOut: vi.fn() }))
vi.mock('firebase/auth', () => firebaseAuth)
vi.mock('../firebase', () => ({ auth: {} }))

const created = (offsetMs: number) => new Date(VERIFICATION_REQUIRED_FROM + offsetMs).toUTCString()
const fakeUser = (emailVerified: boolean, creationTime?: string) =>
  ({ email: 'rider@example.com', emailVerified, metadata: { creationTime } }) as User

describe('needsEmailVerification', () => {
  it('asks unverified accounts created from the cutoff on', () => {
    expect(needsEmailVerification(fakeUser(false, created(0)))).toBe(true)
    expect(needsEmailVerification(fakeUser(false, created(86_400_000)))).toBe(true)
  })

  it('leaves verified and older accounts alone', () => {
    expect(needsEmailVerification(fakeUser(true, created(86_400_000)))).toBe(false)
    expect(needsEmailVerification(fakeUser(false, created(-1000)))).toBe(false)
    expect(needsEmailVerification(fakeUser(false, undefined))).toBe(false)
  })
})

describe('RequireAuth', () => {
  beforeEach(() => vi.clearAllMocks())

  const renderGate = (user: User, reload = vi.fn(async () => {})) => render(
    <MantineProvider>
      <AuthContext.Provider value={{ user, reload }}>
        <MemoryRouter initialEntries={['/activities']}>
          <Routes>
            <Route path='/activities' element={<RequireAuth><p>Your rides</p></RequireAuth>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </MantineProvider>
  )

  it('shows the page to verified and older accounts', () => {
    renderGate(fakeUser(false, created(-1000)))
    expect(screen.getByText('Your rides')).toBeInTheDocument()
  })

  it('asks a new account to verify, and can send the link again', async () => {
    const user = fakeUser(false, created(1000))
    const reload = vi.fn(async () => {})
    renderGate(user, reload)
    expect(screen.queryByText('Your rides')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Verify your email' })).toBeInTheDocument()
    expect(screen.getByText('rider@example.com')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: "I've verified my email" }))
    expect(reload).toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent("isn't verified yet")

    await userEvent.click(screen.getByRole('button', { name: 'Send a new link' }))
    expect(firebaseAuth.sendEmailVerification).toHaveBeenCalledWith(user)
    expect(screen.getByRole('alert')).toHaveTextContent('We sent a new link to rider@example.com')
  })
})
