import { Link, useLocation } from 'react-router'
import { Accordion, Anchor, Code, Image, List, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core'
import { CSV_COLUMNS } from './guide/csvColumns'

const PROTOCOL = [
  'Wind ruins results. Test on a still day, or with wind under 5 km/h (3 mph).',
  'Pick a safe, traffic-free loop, out-and-back or half-pipe course. Keep loops short (300 m–1.5 km), ride each at a different speed, and follow the same line through corners. Varying the speed makes it easier to separate CdA from Crr.',
  'Record the whole test as one file and press the lap button to separate runs; each set of 5–6 loops makes a good segment.',
  'Some elevation change helps: an industrial-park loop, a flat road or velodrome, or an out-and-back on a slight hill all work.',
  "Don't brake. Choose a course where you can turn safely without braking.",
  'Hold your position for the whole run, and stay safe in tight turns on the aerobars.',
  'Weigh yourself in full kit, weigh the bike as tested, and enter both in your profile.',
  'GPS speed is less accurate than it looks. Use a wheel or hub speed sensor as the primary speed source.',
  "Record every second rather than with 'smart recording'.",
  'Zero or calibrate your power meter before testing.',
  'Note temperature, dew point and air pressure, or let MyCdA look them up for the time and place of your ride.'
]

export function FaqPage () {
  const { hash } = useLocation()
  return (
    <Stack gap='md' py='md' maw={900}>
      <Title order={1}>Frequently asked questions</Title>
      <Text>
        Quick answers to common questions. For a full walkthrough, from collecting data to comparing setups, read the{' '}
        <Anchor component={Link} to='/guide'>user guide</Anchor>. Still stuck? Ask the <Anchor href='https://groups.google.com/forum/#!forum/mycda' target='_blank'>user community</Anchor> or{' '}
        <Anchor href='mailto:support@mycda.app'>contact us</Anchor>.
      </Text>
      <Accordion variant='separated' defaultValue={hash === '#csv' ? 'csv' : 'fit'}>
        <Accordion.Item value='fit'>
          <Accordion.Control>Which files can I upload?</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Text>
                Cycling activities in the <Anchor href='https://developer.garmin.com/fit/' target='_blank'>FIT format</Anchor> from
                Garmin and most other head units. Files that import into Garmin Connect, TrainingPeaks or Strava generally work,
                including gzipped exports (<Code>.fit.gz</Code>) and zip downloads from Garmin Connect. You can also upload CSV files
                (see below).
              </Text>
              <Text>
                The file needs speed (from a sensor or GPS) for most of the ride, and power for the analysis. GPS adds the map, loop
                detection and the wind model. GPX, TCX and PWX files aren't supported: upload the original .FIT file instead.
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='csv' id='csv'>
          <Accordion.Control>What format do CSV files need?</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Text>
                CSV lets you import data from older power meters, spreadsheets, or sensors the FIT format doesn't cover, such as air
                speed. The first row holds the column names (any order, any case).
              </Text>
              <Table withTableBorder>
                <Table.Thead><Table.Tr><Table.Th>Column</Table.Th><Table.Th /><Table.Th>Contents</Table.Th></Table.Tr></Table.Thead>
                <Table.Tbody>
                  {CSV_COLUMNS.map(([name, required, text]) => (
                    <Table.Tr key={name}><Table.Td><Code>{name}</Code></Table.Td><Table.Td>{required}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Text>CSV files don't carry a date, so elapsed times are counted from when you upload unless the time column has full dates.</Text>
              <Anchor href='/mycda-example.csv' download>Download an example CSV</Anchor>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='protocol'>
          <Accordion.Control>How should I collect test data?</Accordion.Control>
          <Accordion.Panel>
            <List spacing='xs'>{PROTOCOL.map((item) => <List.Item key={item}>{item}</List.Item>)}</List>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='analysis'>
          <Accordion.Control>How do I estimate CdA?</Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Text>
                Open an activity, select a lap or a range on the chart, and analyze it. Enter total mass, air density and Crr, then
                adjust CdA until the virtual elevation profile levels out: with the right combination, each loop starts and ends
                at the same virtual elevation.
              </Text>
              <SimpleGrid cols={{ base: 1, sm: 3 }}>
                {[['cdalow', 'CdA too low'], ['cdahigh', 'CdA too high'], ['cdaright', 'CdA about right']].map(([file, caption]) => (
                  <figure key={file} style={{ margin: 0 }}>
                    <Image src={`/images/${file}.png`} alt={caption} radius='sm' />
                    <Text component='figcaption' size='sm' ta='center' c='dimmed' mt={4}>{caption}</Text>
                  </figure>
                ))}
              </SimpleGrid>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  )
}
