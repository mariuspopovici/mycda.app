// Browser APIs Mantine needs that jsdom lacks. No-ops under the node environment.
if (typeof window !== 'undefined') {
  const { default: matchers } = await import('@testing-library/jest-dom/matchers')
  const { expect, afterEach } = await import('vitest')
  const { cleanup } = await import('@testing-library/react')
  expect.extend(matchers)
  afterEach(() => cleanup())

  window.matchMedia ??= (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: () => {}, removeListener: () => {}, addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false
  }) as MediaQueryList
  window.ResizeObserver ??= class { observe () {} unobserve () {} disconnect () {} }
  window.HTMLElement.prototype.scrollIntoView ??= () => {}
}
