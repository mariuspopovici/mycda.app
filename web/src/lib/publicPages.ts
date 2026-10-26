// type-only: the guide is lazy-loaded, so its sections mustn't be imported into the main bundle
import type { GuideSection } from '../pages/guide/sections'
import type { PageMeta } from './pageMeta'

/**
 * Metadata of the pages anyone can open. These are listed in public/sitemap.xml (checked by
 * lib/seo.test.ts); add new public pages here.
 */
export const PUBLIC_PAGES = {
  home: { path: '/' },
  faq: {
    path: '/faq',
    title: 'Frequently asked questions',
    description: 'Answers about MyCdA: which files you can upload, the CSV format, how to collect field test data and how to estimate CdA and Crr.'
  },
  about: {
    path: '/about',
    title: 'About',
    description: "MyCdA is a free tool that estimates cycling CdA and Crr from power meter data with R. Chung's virtual elevation method."
  },
  rho: {
    path: '/rho',
    title: 'Air density calculator',
    description: 'Calculate air density (rho) for cycling aerodynamics from temperature, humidity and air pressure or altitude, or look up the current weather.'
  },
  privacy: { path: '/privacy', title: 'Privacy policy', description: 'How MyCdA collects, uses and protects your data.' },
  terms: { path: '/terms', title: 'Terms of use', description: 'The terms for using MyCdA.' }
} satisfies Record<string, PageMeta>

/**
 * Account pages: open to anyone but served by the app shell, so not prerendered or in the sitemap.
 * Sign-in and sign-up stay findable in search; the others are no use to a searcher.
 */
export const ACCOUNT_PAGES = {
  login: { path: '/login', title: 'Sign in', description: 'Sign in to MyCdA to upload rides and estimate your CdA and Crr.' },
  signup: {
    path: '/signup',
    title: 'Create a free account',
    description: 'Sign up for MyCdA, a free tool that estimates your cycling CdA and Crr from power meter field tests.'
  },
  reset: { title: 'Reset password', noindex: true },
  authAction: { title: 'Account', noindex: true }
} satisfies Record<string, PageMeta>

/** A guide section's metadata. */
export const guidePageMeta = (section: GuideSection): PageMeta => ({
  path: `/guide/${section.slug}`,
  title: `${section.title} – user guide`,
  description: `${section.summary}. From the MyCdA guide to field testing cycling aerodynamics with a power meter.`
})

