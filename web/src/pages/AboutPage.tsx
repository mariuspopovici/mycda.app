import { Link } from 'react-router'
import { Anchor, Button, Group, List, Stack, Text, Title } from '@mantine/core'
import { IconBrandGithub, IconBrandInstagram, IconBug } from '@tabler/icons-react'

export function AboutPage () {
  return (
    <Stack gap='md' py='md' maw={760}>
      <Title order={1}>About MyCdA</Title>
      <Text size='lg'>
        MyCdA uses data from a power meter, speed sensor and cycling computer to estimate your drag area (CdA) and rolling
        resistance (Crr). Compare runs to find out whether a change in position or equipment is worth it.
      </Text>
      <Text>
        A rule of thumb for race day: reducing CdA by 0.005 m² is worth about 5 W, or roughly 20 seconds over 40 km.
      </Text>
      <Text>MyCdA is free software.</Text>
      <List spacing='xs'>
        <List.Item>
          The virtual elevation method follows the algorithm described by R. Chung in{' '}
          <Anchor href='http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf' target='_blank'>Estimating CdA with a power meter</Anchor>.
        </List.Item>
        <List.Item>Weather and elevation data: <Anchor href='https://open-meteo.com/' target='_blank'>Open-Meteo</Anchor>. Maps: © OpenStreetMap contributors.</List.Item>
        <List.Item>Developer: <Anchor href='mailto:marius@popovici.net'>marius@popovici.net</Anchor></List.Item>
        <List.Item>Version {__APP_VERSION__}</List.Item>
      </List>
      <Group>
        <Button component='a' href='https://github.com/mariuspopovici/mycda.app/' target='_blank' variant='default' leftSection={<IconBrandGithub size={18} />}>GitHub</Button>
        <Button component='a' href='https://github.com/mariuspopovici/mycda.app/issues' target='_blank' variant='default' leftSection={<IconBug size={18} />}>Report an issue</Button>
        <Button component='a' href='https://www.instagram.com/mycda.app/' target='_blank' variant='default' leftSection={<IconBrandInstagram size={18} />}>Instagram</Button>
      </Group>
      <Text>
        Have a question? Read the <Anchor component={Link} to='/faq'>FAQ</Anchor> or join the{' '}
        <Anchor href='https://groups.google.com/forum/#!forum/mycda' target='_blank'>user community</Anchor>.
      </Text>
    </Stack>
  )
}
