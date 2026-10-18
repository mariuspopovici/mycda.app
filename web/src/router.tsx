import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppLayout } from './layout/AppLayout'
import { LegacyHashRedirect } from './layout/LegacyHashRedirect'
import { AboutPage } from './pages/AboutPage'
import { ActivitiesPage } from './pages/activities/ActivitiesPage'
import { ActivityPage } from './pages/ActivityPage'
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
  element: <LegacyHashRedirect />,
  children: [{
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
      { path: 'activity/:id', element: authed(<ActivityPage />) },
      { path: 'profile', element: authed(<ProfilePage />) },
      { path: 'faq', element: <FaqPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: 'terms', element: <LegalPage document='terms' /> },
      { path: 'privacy', element: <LegalPage document='privacy' /> },
      { path: '*', element: <NotFoundPage /> }
    ]
  }]
}]

export const router = createBrowserRouter(routes)
