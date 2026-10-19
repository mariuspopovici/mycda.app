import { List, Table, Text } from '@mantine/core'
import { Bullets, Caution, GuideLink, H2, Steps, Tip, Ui } from '../parts'

export function TestsGuide () {
  return (
    <>
      <Text>
        A typical session holds several tests: out and back runs in different positions or with different equipment. The{' '}
        <Ui>Tests</Ui> tab on the activity page shows all of them on one screen. MyCdA pairs the legs, fits a CdA for each test
        with the same parameters, and lets you save them all at once. It appears on rides with more than one lap, and opens first
        when tests are found.
      </Text>

      <H2 id='pairing'>How tests are found</H2>
      <Text>MyCdA looks at the laps you recorded with the lap button and pairs each out leg with its back leg. Two laps pair when:</Text>
      <Bullets>
        <List.Item>both are fairly straight and at least 300 m long;</List.Item>
        <List.Item>they're within 25 % of each other's length;</List.Item>
        <List.Item>the second heads back the opposite way (within 30°) and ends close to where the first started;</List.Item>
        <List.Item>there are at most 4 laps between them (turnarounds and recoveries).</List.Item>
      </Bullets>
      <Text>
        Short laps in between, such as turnarounds, are left out of the test. Rides without out and back pairs, like circuits or
        velodrome sessions, list each closed lap (one that ends where it started) as a test instead, skipping laps much shorter than
        the rest (recovery laps).
      </Text>
      <Text>Pairing needs GPS. Without it, add the tests yourself.</Text>

      <H2 id='editing'>Correcting the list</H2>
      <Bullets>
        <List.Item>Change a test's laps in its <Ui>Laps</Ui> field: remove one with its ×, or pick another from the list.</List.Item>
        <List.Item><Ui>Add test</Ui> adds an empty row to fill in; the bin removes a test from the list.</List.Item>
        <List.Item><Ui>Find again</Ui> goes back to the automatic pairing.</List.Item>
        <List.Item>The target button shows a test's laps on the chart and the map, to check it's what you think it is.</List.Item>
      </Bullets>
      <Text>
        Changes to the list aren't stored: next time you open the ride, the tests are found again. What you save is kept (see
        below).
      </Text>

      <H2 id='parameters'>Shared parameters</H2>
      <Text>
        Every test of a ride is fitted with the same <b>mass</b>, <b>air density (ρ)</b>, <b>Crr</b>, <b>drivetrain loss</b> and{' '}
        <b>air speed</b> source, so their CdAs are directly comparable. They start from the{' '}
        <GuideLink to='activity#ride-settings'>ride settings</GuideLink>. The calculator next to ρ looks up the weather where and when
        the first test starts. Air speed works as on the analysis page (see <GuideLink to='analysis#airspeed'>Air speed</GuideLink>);
        the wind exposure comes from the ride settings.
      </Text>
      <Tip>
        Changed equipment that changes mass between tests, for example a heavier wheel set? Analyze those tests separately from the
        analysis page, where each has its own mass.
      </Tip>

      <H2 id='columns'>Reading the table</H2>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Time, distance', 'Of the test legs only, without the turnaround.'],
            ['Avg. speed, power', 'Averaged over the time you were moving.'],
            ['CdA', "Fitted so that the test's virtual elevation ends at the same height as it started."],
            ['Closure', 'How far from level the run ends at that CdA. Near zero is normal; a large value means no CdA could close the run, so check the test.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={150}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text>
        Below the table, the <b>mean</b>, <b>standard deviation (SD)</b> and <b>coefficient of variation (CV)</b> of the CdAs show how
        consistent the tests are. Repeated tests of one setup typically agree within 2–3 %. See{' '}
        <GuideLink to='comparing#noise'>telling real differences from noise</GuideLink>.
      </Text>
      <Caution>
        Each test is fitted by closure alone, with Crr held at the value you entered: one closed run can't separate Crr from CdA.
        A wrong Crr shifts every test's CdA by a similar amount, so comparisons between tests stay fair, but the absolute values are
        only as good as your Crr.
      </Caution>

      <H2 id='saving'>Saving and opening tests</H2>
      <Steps>
        <List.Item><Ui>Save N tests</Ui> saves every unsaved test as an analysis named "Test 1 (laps 2 + 5)" and so on, with the table's parameters and its CdA.</List.Item>
        <List.Item>Saved tests show a <Ui>Saved</Ui> badge and keep their saved values. A test counts as saved when an analysis of exactly its laps exists, however it was created.</List.Item>
        <List.Item>Click <Ui>Test N</Ui> to open it: a saved test opens its analysis; an unsaved one opens a new analysis that starts with the table's parameters.</List.Item>
      </Steps>
      <Text>
        Opening a test is worth it before trusting a number: look at its virtual elevation (see{' '}
        <GuideLink to='analysis#reading'>Reading the chart</GuideLink>), and rename and describe it once saved.
      </Text>
    </>
  )
}
