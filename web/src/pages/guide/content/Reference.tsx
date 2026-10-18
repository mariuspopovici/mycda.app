import { Anchor, Code, List, Table, Text } from '@mantine/core'
import { CSV_COLUMNS } from '../csvColumns'
import { AppLink, Bullets, H2 } from '../parts'

const GLOSSARY: Array<[string, string]> = [
  ['CdA', 'Drag area: drag coefficient × frontal area, in m². The aerodynamic drag of you and your bike.'],
  ['Crr', 'Coefficient of rolling resistance: the drag of the tyres on the road, as a fraction of weight.'],
  ['ρ (rho)', 'Air density, in kg/m³: about 1.225 at sea level and 15 °C, lower when warm, humid or high up.'],
  ['Virtual elevation (VE)', 'The elevation profile your power, speed and parameters imply. It matches the road when the parameters are right.'],
  ['Closure', 'A run or loop ending at the height it started. The closure error is how far it misses.'],
  ['Drivetrain loss', 'Power lost between the power meter and the rear tyre, in percent.'],
  ['Air speed', 'Your speed relative to the air: ground speed plus the headwind component.'],
  ['Yaw', 'The angle between the oncoming air and your direction of travel, caused by crosswind.'],
  ['Wind exposure', "How sheltered a course is, which sets how much of the 10 m wind reaches rider height."],
  ['Station pressure', 'The absolute air pressure where you are. Sea-level pressure is the same reading adjusted to sea level, as weather reports give it.'],
  ['Baseline', 'The saved analysis of a ride the others are compared with.'],
  ['SD, CV', 'Standard deviation of repeated results, and the same as a percentage of their mean (coefficient of variation).']
]

export function Reference () {
  return (
    <>
      <H2 id='glossary'>Glossary</H2>
      <Table withTableBorder>
        <Table.Tbody>
          {GLOSSARY.map(([term, text]) => (
            <Table.Tr key={term}><Table.Td fw={600} w={190}>{term}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <H2 id='csv'>CSV format</H2>
      <Text>
        The first row holds the column names, in any order and any case. One row per sample, ideally one per second.
      </Text>
      <Table withTableBorder>
        <Table.Thead><Table.Tr><Table.Th>Column</Table.Th><Table.Th /><Table.Th>Contents</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>
          {CSV_COLUMNS.map(([name, required, text]) => (
            <Table.Tr key={name}><Table.Td><Code>{name}</Code></Table.Td><Table.Td>{required}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text>
        CSV files don't carry a date, so elapsed times are counted from when you upload unless the time column has full dates.{' '}
        <Anchor href='/mycda-example.csv' download>Download an example CSV</Anchor>.
      </Text>

      <H2 id='physics'>The physics</H2>
      <Text>Between two consecutive samples, the energy balance gives the change in virtual elevation Δh:</Text>
      <Code block>{'m·g·Δh = η·P·Δt − Crr·m·g·v·Δt − ½·CdA·ρ·v_air·|v_air|·v·Δt − ½·m·(v² − v₀²)'}</Code>
      <Bullets>
        <List.Item><Code>m</Code> total mass, <Code>g</Code> 9.81 m/s², <Code>P</Code> power, <Code>η</Code> 1 − drivetrain loss</List.Item>
        <List.Item><Code>v</Code> and <Code>v₀</Code> ground speed now and at the previous sample, <Code>v_air</Code> air speed (negative in a tailwind faster than you)</List.Item>
        <List.Item>Summing Δh from the start gives the virtual elevation. Across joins between laps it holds level; across pauses over 10 s it follows the recorded elevation.</List.Item>
      </Bullets>
      <Text>
        Fitting searches CdA (and Crr when possible) for the values that minimize the closure error or the difference from the
        recorded elevation.
      </Text>

      <H2 id='units'>Units</H2>
      <Text>
        Choose metric or imperial in your <AppLink to='/profile'>profile</AppLink>. Everything is stored in metric and converted for
        display, so switching never changes a result. CdA is always in m². Air density shows in kg/m³ or lb/ft³ (1 kg/m³ = 0.0624
        lb/ft³).
      </Text>

      <H2 id='privacy'>Data and privacy</H2>
      <Bullets>
        <List.Item>Your activities, files and analyses are stored in your account. Only you can see them.</List.Item>
        <List.Item>Weather lookups send the ride's approximate location and time to Open-Meteo. Maps load tiles from OpenStreetMap.</List.Item>
        <List.Item>Deleting an activity deletes its file and analyses. See the <AppLink to='/privacy'>privacy policy</AppLink> for details.</List.Item>
      </Bullets>

      <H2 id='reading'>Further reading</H2>
      <Bullets>
        <List.Item>
          R. Chung, <Anchor href='http://anonymous.coward.free.fr/wattage/cda/indirect-cda.pdf' target='_blank'>Estimating CdA with a power
          meter</Anchor>: the virtual elevation method.
        </List.Item>
        <List.Item>
          J. C. Martin et al. (1998), <i>Validation of a mathematical model for road cycling power</i>, Journal of Applied Biomechanics
          14: the power model behind the equation above.
        </List.Item>
        <List.Item><Anchor href='https://open-meteo.com/' target='_blank'>Open-Meteo</Anchor>: the weather data used for wind and air density.</List.Item>
      </Bullets>
    </>
  )
}
