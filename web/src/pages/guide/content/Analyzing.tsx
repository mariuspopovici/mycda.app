import { List, Table, Text } from '@mantine/core'
import { AppLink, Bullets, Caution, GuideLink, H2, H3, Steps, Tip, Ui } from '../parts'

export function Analyzing () {
  return (
    <>
      <Text>
        The analysis page shows the virtual elevation of a run, the parameters behind it and the air speed it uses. A new analysis
        opens already fitted: CdA is set to the value that best explains the run, and you check and refine it from there.
      </Text>

      <H2 id='reading'>Reading the chart</H2>
      <Text>
        The chart draws the <b>virtual elevation</b> (VE) computed from your power, speed and parameters, over the{' '}
        <b>recorded elevation</b> from your device. Switch the axis between <Ui>Distance</Ui> and <Ui>Time</Ui>, hide the recorded
        elevation, or shade the <Ui>Laps</Ui> or <Ui>Loops</Ui> of the run.
      </Text>
      <Bullets>
        <List.Item><b>A good fit</b> follows the shape of the road, and on a loop or out and back ends at the height it started.</List.Item>
        <List.Item><b>VE climbs steadily</b>: CdA (or Crr) is too low. Power that wasn't spent on drag shows up as climbing.</List.Item>
        <List.Item><b>VE sinks steadily</b>: CdA (or Crr) is too high.</List.Item>
        <List.Item><b>A sudden step</b> usually means braking, a power dropout or a GPS speed glitch, not your position. Avoid that stretch.</List.Item>
        <List.Item><b>VE rises one way and falls the other</b> on an out and back: wind. Try the <Ui>Weather</Ui> or <Ui>Manual</Ui> air speed.</List.Item>
      </Bullets>
      <Text>Under the chart:</Text>
      <Bullets>
        <List.Item><b>Difference from recorded elevation (RMS)</b>: how closely VE follows the recorded elevation over the whole run.</List.Item>
        <List.Item><b>Run closure error</b>, for joined runs: how far from its starting height the run ends. Close to 0 is the goal.</List.Item>
        <List.Item><b>Loop drift (RMS)</b>, with the loops overlay: how far each loop ends from where it started, with a table per loop.</List.Item>
      </Bullets>
      <Text>
        When several laps are joined into one run, dashed lines mark the joins. VE holds level across each join, and distance
        continues from where the previous leg ended.
      </Text>

      <H2 id='parameters'>Parameters</H2>
      <Text>
        <b>Total mass</b>, <b>air density</b>, <b>Crr</b> and <b>drivetrain loss</b> start from the saved analysis, the{' '}
        <GuideLink to='activity#ride-settings'>ride settings</GuideLink> or your <AppLink to='/profile'>profile</AppLink>, in that
        order. <b>CdA</b> has a slider for quick exploration (0.100–0.600 m²) and a box for exact values; the profile updates as you
        move it.
      </Text>

      <H2 id='suggest'>Suggest CdA</H2>
      <Text>
        A new analysis opens at the suggested CdA, and the note under the parameters says how it was found. If you change CdA,{' '}
        <Ui>Reset to</Ui> brings back the suggestion. The suggestion is refitted whenever you change the other parameters or the air
        speed. <Ui>Suggest CdA</Ui> fits again on demand, by one of:
      </Text>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Close the run (out and back)', 'For joined runs: the run ends at the height it started. Insensitive to elevation errors, which cancel at the same place.'],
            ['Close the loops', 'Each loop found in the run ends at the height it started. Works with noisy elevation data.'],
            ['Match recorded elevation', 'VE follows the recorded elevation as closely as possible. Needs good (barometric) elevation data.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={200}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <H3 id='crr'>Fitting Crr too</H3>
      <Text>
        Tick <Ui>Fit Crr too</Ui> to fit Crr along with CdA. That only works when the run holds enough information to tell them apart:
        the recorded elevation, or two or more loops ridden at different speeds. A single closed run is one equation with two
        unknowns: many CdA and Crr pairs close it equally well, so MyCdA then fits CdA only and keeps your Crr.
      </Text>
      <Caution title='At the edge of the range'>
        If a fit ends at the edge of the plausible range (CdA 0.05 or 0.80 m², Crr 0.001 or 0.02), MyCdA warns you. No sensible value
        explains the run: check the power data, mass, air density and air speed source. See{' '}
        <GuideLink to='troubleshooting'>Troubleshooting</GuideLink>.
      </Caution>

      <H2 id='airspeed'>Air speed</H2>
      <Text>Drag depends on your speed relative to the air. The <Ui>Air speed</Ui> card chooses where that comes from:</Text>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Measured', 'Air speed recorded by a sensor in the file. The most accurate when available.'],
            ['Still air', 'Air speed equals ground speed. Right on windless days; the default without a sensor.'],
            ['Weather', 'Hourly wind for the time and place of the ride, from Open-Meteo: forecast models for the last 90 days, reanalysis before that. Needs GPS. Treat results as indicative.'],
            ['Manual', 'A constant wind you enter: speed and the direction it blows from (0° north, 90° east). Use it when you measured the wind, or when the weather data looks wrong.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={120}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text>
        With a wind, the GPS track gives your direction of travel at every point, and the wind's component along it is added to
        your ground speed: a headwind raises air speed, a tailwind lowers it. A crosswind doesn't add drag directly; its effect on
        your position's drag (yaw) is part of the CdA you measure.
      </Text>
      <H3 id='exposure'>Wind at rider height</H3>
      <Text>
        Forecasts and weather stations report the wind 10 m above the ground. Near the ground it's slower, more so among trees and
        buildings. MyCdA scales the 10 m wind to rider height using the ride's <b>wind exposure</b>, set in the{' '}
        <GuideLink to='activity#ride-settings'>ride settings</GuideLink>:
      </Text>
      <Table withTableBorder>
        <Table.Thead><Table.Tr><Table.Th>Exposure</Table.Th><Table.Th>Course</Table.Th><Table.Th ta='right'>Wind at rider height</Table.Th></Table.Tr></Table.Thead>
        <Table.Tbody>
          <Table.Tr><Table.Td>Open</Table.Td><Table.Td>fields, seafront</Table.Td><Table.Td ta='right'>× 0.60</Table.Td></Table.Tr>
          <Table.Tr><Table.Td>Mixed (default)</Table.Td><Table.Td>hedges, scattered trees</Table.Td><Table.Td ta='right'>× 0.50</Table.Td></Table.Tr>
          <Table.Tr><Table.Td>Sheltered</Table.Td><Table.Td>suburbs, woods</Table.Td><Table.Td ta='right'>× 0.41</Table.Td></Table.Tr>
        </Table.Tbody>
      </Table>
      <Text>
        A manual wind is scaled the same way, unless you tick <Ui>Measured at rider height</Ui>, for example with a handheld
        anemometer at handlebar height.
      </Text>

      <H2 id='air-density'>Air density</H2>
      <Text>
        The calculator button next to air density opens the air density calculator (also on its own at{' '}
        <AppLink to='/rho'>/rho</AppLink>). <Ui>Look up the ride's weather</Ui> fills in temperature, dew point and pressure for the
        time and place of the ride; <Ui>Use current conditions here</Ui> uses your location now. You can also type the values:
      </Text>
      <Bullets>
        <List.Item><b>Temperature</b>, and either <b>dew point</b> or <b>relative humidity</b>.</List.Item>
        <List.Item><b>Sea-level pressure</b>, as weather services report it, with the <b>altitude</b> where you rode, or <b>station pressure</b>, the absolute pressure a barometer reads where you rode.</List.Item>
      </Bullets>
      <Text>Press <Ui>Use this value</Ui> to copy the result into the analysis.</Text>

      <H2 id='saving'>Saving and exporting</H2>
      <Steps>
        <List.Item>Give the analysis a <b>name</b> (and notes, such as the position or equipment tested).</List.Item>
        <List.Item>Optionally make it the ride's <b>baseline</b>: the other analyses of the ride are compared with it.</List.Item>
        <List.Item>Press <Ui>Save</Ui>. The analysis stores its laps or range and every parameter, including the air speed source.</List.Item>
      </Steps>
      <Text>
        Reopening a saved analysis restores exactly what you saved. If you change a saved analysis and close or reload the tab
        before saving, the browser asks first. <Ui>Export CSV</Ui> downloads the run with time, distance, power, speed, air speed, recorded
        and virtual elevation, for your own spreadsheet. <Ui>Delete</Ui> removes the analysis.
      </Text>
      <Tip>
        Save one analysis per test, named after what you changed ("Helmet A", "Elbows narrow"), and mark your usual setup as the
        baseline. The activity page then compares every test with it.
      </Tip>
    </>
  )
}
