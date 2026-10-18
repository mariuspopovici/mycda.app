import '@mantine/core/styles.css'
import '@mantine/dropzone/styles.css'
import '@mantine/notifications/styles.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { localStorageColorSchemeManager, MantineProvider } from '@mantine/core'
import { ModalsProvider } from '@mantine/modals'
import { Notifications } from '@mantine/notifications'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './auth/AuthProvider'
import { router } from './router'
import { theme } from './theme'

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })
const colorSchemeManager = localStorageColorSchemeManager({ key: 'mycda-color-scheme' })

const render = () => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme='auto' colorSchemeManager={colorSchemeManager}>
      <Notifications position='top-center' />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ModalsProvider>
            <RouterProvider router={router} />
          </ModalsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>
)

// Public pages arrive prerendered (scripts/prerender.mjs). Mounting before a lazy route (the guide)
// has loaded would blank that content, so wait for the router to finish its initial load.
if (router.state.initialized) {
  render()
} else {
  const unsubscribe = router.subscribe((state) => {
    if (!state.initialized) return
    unsubscribe()
    render()
  })
}
