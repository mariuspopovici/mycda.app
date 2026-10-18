import { useEffect } from 'react'

export const SITE_URL = 'https://mycda.app'
export const DEFAULT_TITLE = 'MyCdA – field testing for cycling aerodynamics'
export const DEFAULT_DESCRIPTION =
  'Estimate your cycling drag area (CdA) and rolling resistance (Crr) from power meter field tests. Free, with a step-by-step guide to testing positions and equipment.'

export interface PageMeta {
  /** Page title, shown as "<title> · MyCdA". The default title when absent. */
  title?: string
  description?: string
  /** Path of the canonical URL, e.g. "/faq". No canonical link when absent. */
  path?: string
  /** Keep the page out of search results (not found, private pages). */
  noindex?: boolean
}

function setMeta (attribute: 'name' | 'property', key: string, content: string | undefined) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (content === undefined) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function setCanonical (href: string | undefined) {
  let element = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (href === undefined) {
    element?.remove()
    return
  }
  if (!element) {
    element = document.createElement('link')
    element.rel = 'canonical'
    document.head.appendChild(element)
  }
  element.href = href
}

/**
 * Sets the document's title, description, canonical URL, social preview tags and robots tag.
 * index.html carries the defaults, and the site-wide preview image and structured data.
 */
export function applyPageMeta ({ title, description, path, noindex }: PageMeta) {
  const fullTitle = title ? `${title} · MyCdA` : DEFAULT_TITLE
  const fullDescription = description ?? DEFAULT_DESCRIPTION
  const url = path === undefined ? undefined : SITE_URL + path
  document.title = fullTitle
  setMeta('name', 'description', fullDescription)
  setMeta('property', 'og:title', fullTitle)
  setMeta('property', 'og:description', fullDescription)
  setMeta('property', 'og:url', url)
  setMeta('name', 'robots', noindex ? 'noindex' : undefined)
  setCanonical(url)
}

/** Page metadata while the calling page is shown; the defaults come back when it unmounts. */
export function usePageMeta ({ title, description, path, noindex }: PageMeta) {
  useEffect(() => {
    applyPageMeta({ title, description, path, noindex })
    return () => applyPageMeta({})
  }, [title, description, path, noindex])
}
