import type { ReactNode } from 'react'
import { BackgroundImage, Center, Paper, Title } from '@mantine/core'

/** Centered card over a full-bleed ride photo, used by the sign-in and account pages. */
export function AuthCard ({ title, image, children }: { title: string, image: string, children: ReactNode }) {
  return (
    <BackgroundImage src={image} radius='md' mih='calc(100dvh - 180px)'>
      <Center mih='calc(100dvh - 180px)' p='md'>
        <Paper withBorder shadow='md' p='xl' w='100%' maw={440}>
          <Title order={2} mb='lg'>{title}</Title>
          {children}
        </Paper>
      </Center>
    </BackgroundImage>
  )
}
