// Browser APIs Mantine needs that jsdom lacks. No-ops under the node environment.
if (typeof window !== 'undefined') {
  // registers jest-dom's matchers with Vitest's expect
  await import('@testing-library/jest-dom/vitest')
  const { afterEach } = await import('vitest')
  const { cleanup } = await import('@testing-library/react')
  afterEach(() => cleanup())

  window.matchMedia ??= (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false
  }) as MediaQueryList
  window.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }
  window.HTMLElement.prototype.scrollIntoView ??= () => {}
}
