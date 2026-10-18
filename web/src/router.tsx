import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { pathFromLegacyHash } from './lib/legacyUrls'
import { AboutPage } from './pages/AboutPage'
import { AirDensityPage } from './pages/AirDensityPage'
import { LegacyCdaRedirect } from './layout/LegacyCdaRedirect'
import { ActivitiesPage } from './pages/activities/ActivitiesPage'
import { AuthActionPage } from './pages/AuthActionPage'
import { FaqPage } from './pages/FaqPage'
import { LandingPage } from './pages/LandingPage'
import { LegalPage } from './pages/LegalPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SignUpPage } from './pages/SignUpPage'

const authed = (element: ReactNode) => <RequireAuth>{element}</RequireAuth>

export const routes: RouteObject[] = [{
  element: <AppLayout />,
  children: [
    { index: true, element: <LandingPage /> },
    { path: 'landing', element: <Navigate to='/' replace /> },
    { path: 'login', element: <LoginPage /> },
    { path: 'signup', element: <SignUpPage /> },
    { path: 'reset', element: <ResetPasswordPage /> },
    { path: 'auth/action', element: <AuthActionPage /> },
    { path: 'activities', element: authed(<ActivitiesPage />) },
    { path: 'home', element: <Navigate to='/activities' replace /> },
    // the analysis pages pull in Plotly and Leaflet, so they load on demand
    {
      path: 'activity/:id',
      lazy: async () => {
        const { ActivityPage } = await import('./pages/activity/ActivityPage')
        return { element: authed(<ActivityPage />) }
      }
    },
    {
      path: 'activity/:id/analysis/:sid?',
      lazy: async () => {
        const { AnalysisPage } = await import('./pages/analysis/AnalysisPage')
        return { element: authed(<AnalysisPage />) }
      }
    },
    { path: 'activity/:id/cda/:sid?', element: <LegacyCdaRedirect /> },
    { path: 'rho', element: <AirDensityPage /> },
    { path: 'profile', element: authed(<ProfilePage />) },
    { path: 'faq', element: <FaqPage /> },
    { path: 'about', element: <AboutPage /> },
    { path: 'terms', element: <LegalPage document='terms' /> },
    { path: 'privacy', element: <LegalPage document='privacy' /> },
    { path: '*', element: <NotFoundPage /> }
  ]
}]

// Legacy hash URLs (/#/activity/…) are rewritten before the router starts, so it only ever sees
// the new path (redirecting from an effect raced with lazy-loaded routes).
const legacyPath = pathFromLegacyHash(window.location.hash)
if (legacyPath) window.history.replaceState(null, '', legacyPath)

export const router = createBrowserRouter(routes)

// Opening an old link from a page already on the site changes only the hash, without a reload.
window.addEventListener('hashchange', () => {
  const path = pathFromLegacyHash(window.location.hash)
  if (path) router.navigate(path, { replace: true })
})
