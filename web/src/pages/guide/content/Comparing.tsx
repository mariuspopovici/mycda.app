import { List, Table, Text } from '@mantine/core'
import { Bullets, GuideLink, H2, Tip, Ui } from '../parts'

export function Comparing () {
  return (
    <>
      <Text>
        Absolute CdA values depend on your mass, Crr and air density being right. Differences between setups tested the same day,
        on the same course, with the same parameters, are much more reliable. That's what MyCdA is best at.
      </Text>

      <H2 id='baseline'>Baselines</H2>
      <Text>
        Mark one saved analysis per ride as the <b>baseline</b> (the switch next to <Ui>Save</Ui>), usually your normal setup. The
        ride's saved analyses on the activity page are then compared with it:
      </Text>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Δ CdA', 'The difference from the baseline, in percent. Green is faster (lower CdA), red slower.'],
            ['Watts saved', 'The power the change saves at about 48 km/h (30 mph).'],
            ['s / 40 km', 'The time it saves over a 40 km time trial at that speed.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={150}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text>
        As a rule of thumb, 0.005 m² of CdA is worth about 5 W, or 20 seconds over 40 km, at that speed. At lower speeds the savings in
        watts are smaller, but the percentage stays the same.
      </Text>

      <H2 id='noise'>Telling real differences from noise</H2>
      <Text>
        Every test has some scatter: gusts, a slightly different line, a change in temperature. Before believing a difference, compare
        it with the scatter of repeated tests of the same setup:
      </Text>
      <Bullets>
        <List.Item>
          The <b>standard deviation (SD)</b> under the saved analyses and the <GuideLink to='tests'>Tests table</GuideLink> measures
          that scatter. The <b>coefficient of variation (CV)</b> is the SD as a percentage of the mean: 1–3 % is good field testing.
        </List.Item>
        <List.Item>A difference smaller than the SD of repeated runs is probably noise. Test again before changing equipment for it.</List.Item>
        <List.Item>Average several runs per setup: the average of 4 runs is about twice as precise as a single run.</List.Item>
        <List.Item>Alternate setups (A, B, A, B). A steady trend through the session (for example as the wind picks up) then affects both alike instead of looking like a difference.</List.Item>
        <List.Item>One run far from the others is usually a disturbed run (a gust, a car, a lost position). Open it and look at its virtual elevation before including it.</List.Item>
      </Bullets>
      <Tip>
        Short runs are noisier than long ones: the same small disturbance weighs more. If some tests are much shorter than others,
        expect them to scatter more.
      </Tip>

      <H2 id='between-days'>Comparing between days</H2>
      <Text>
        Comparisons between rides are harder: the air density, wind, tyre pressure and even your power meter's zero differ. Give each
        ride its own conditions in its <GuideLink to='activity#ride-settings'>ride settings</GuideLink>, especially air density, and
        include your baseline setup in every session, so each day has its own reference.
      </Text>
    </>
  )
}
