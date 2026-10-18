import { Image, List, SimpleGrid, Table, Text } from '@mantine/core'
import { AppLink, GuideLink, H2, Steps, Tip, Ui } from '../parts'

export function GettingStarted () {
  return (
    <>
      <Text>
        MyCdA estimates your aerodynamic drag area (<b>CdA</b>) and rolling resistance coefficient (<b>Crr</b>) from rides recorded
        with a power meter. You ride a test course, upload the file, and MyCdA finds the values that explain your power, speed and
        elevation. Compare positions, helmets, wheels or clothing on the same course, and see which is faster and by how much.
      </Text>

      <H2 id='what'>What CdA and Crr are</H2>
      <Text>
        At racing speeds most of your power goes into pushing air aside. How much depends on air density, your speed relative to the
        air, and <b>CdA</b>: your frontal area multiplied by how slippery your shape is, in square metres. A road position is
        typically 0.30–0.40 m², a good time trial position 0.20–0.25 m², and the very best below 0.20 m².
      </Text>
      <Text>
        <b>Crr</b> describes the drag of your tyres on the road. It's small (typically 0.003–0.008) and depends on the tyres, their
        pressure and the road surface. Rolling resistance doesn't change with speed, while aerodynamic drag grows with its square,
        which is what lets the two be told apart.
      </Text>

      <H2 id='how'>How it works: virtual elevation</H2>
      <Text>
        MyCdA uses Robert Chung's <b>virtual elevation</b> method. At every second of your ride, the power you put in goes into
        overcoming air and rolling resistance, speeding up, or climbing. Given your mass, air density, Crr and CdA, whatever power is
        left over after drag and acceleration must have gone into climbing. Adding those climbs up second by second draws an
        elevation profile: the <i>virtual</i> elevation.
      </Text>
      <Text>
        With the right CdA and Crr, the virtual elevation follows the real road. With the wrong ones it drifts: on a loop or an out
        and back, the profile doesn't come back to the height it started at.
      </Text>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        {[['cdalow', 'CdA too low: the profile climbs'], ['cdahigh', 'CdA too high: it sinks'], ['cdaright', 'About right: each loop ends level']].map(([file, caption]) => (
          <figure key={file} style={{ margin: 0 }}>
            <Image src={`/images/${file}.png`} alt={caption} radius='sm' />
            <Text component='figcaption' size='sm' ta='center' c='dimmed' mt={4}>{caption}</Text>
          </figure>
        ))}
      </SimpleGrid>
      <Text>
        You can adjust CdA by hand until the profile looks right, or let MyCdA find the value that closes the loop. The method needs
        no wind tunnel and no smooth velodrome, but it does need careful testing: see{' '}
        <GuideLink to='collecting-data'>Collecting test data</GuideLink>.
      </Text>

      <H2 id='account'>Creating an account</H2>
      <Text>
        <AppLink to='/signup'>Sign up</AppLink> with an email address and a password. Your rides and analyses are private to your
        account. You can try the <AppLink to='/rho'>air density calculator</AppLink> without one.
      </Text>

      <H2 id='profile'>Your profile</H2>
      <Text>
        After signing up you land on your <AppLink to='/profile'>profile</AppLink>. Its <Ui>Analysis preferences</Ui> are the
        starting values for every new analysis:
      </Text>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Units', 'Metric or imperial, for everything the app shows. Values are stored in metric, so you can switch at any time.'],
            ['Rider weight', 'Including kit, shoes and helmet: weigh yourself dressed to ride.'],
            ['Bike weight', 'As set up for testing, with bottles, tools and computer.'],
            ['CdA', 'Your best guess. New analyses fit their own starting CdA, so this mostly matters for the profile check.'],
            ['Crr', '0.005 is a fair start for good tyres on good asphalt. See the profile page for scaling roller test data.'],
            ['Drivetrain loss', 'Power lost between the power meter and the road: about 1 % for hub meters, 2–4 % for pedal, crank or spider meters, more with a worn or dirty chain.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={150}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Tip>
        Weight matters more than it seems: every kilogram you leave out is energy the method has to explain some other way, usually
        as rolling resistance or drag. If you don't know a value, keep the suggestion: comparisons between setups stay valid as long
        as you use the same values for all of them.
      </Tip>

      <H2 id='workflow'>The workflow at a glance</H2>
      <Steps>
        <List.Item>Ride a test course, pressing the lap button at the start and end of each run (<GuideLink to='collecting-data'>Collecting test data</GuideLink>).</List.Item>
        <List.Item>Upload the file on the <AppLink to='/activities'>Activities</AppLink> page (<GuideLink to='uploading'>Uploading</GuideLink>).</List.Item>
        <List.Item>Open it. Enter the ride's conditions in <Ui>Ride settings</Ui> (<GuideLink to='activity'>The activity page</GuideLink>).</List.Item>
        <List.Item>Check the <Ui>Tests</Ui> table: it pairs your out and back runs and fits a CdA for each (<GuideLink to='tests'>The Tests table</GuideLink>).</List.Item>
        <List.Item>Open a test to inspect it in detail, and save it (<GuideLink to='analysis'>Analyzing a run</GuideLink>).</List.Item>
        <List.Item>Compare setups against a baseline (<GuideLink to='comparing'>Comparing setups</GuideLink>).</List.Item>
      </Steps>
      <Text>The app works on phones too, but the charts are easier to read on a larger screen.</Text>
    </>
  )
}
