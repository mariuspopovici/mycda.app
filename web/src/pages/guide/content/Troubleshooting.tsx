import { List, Text } from '@mantine/core'
import { AppLink, Bullets, GuideLink, H2, Ui } from '../parts'

export function Troubleshooting () {
  return (
    <>
      <H2 id='implausible'>The CdA is implausible, or at the edge of the range</H2>
      <Text>A CdA far from 0.2–0.4 m², or a warning that the fit hit the edge of the range, means something in the inputs is off. In rough order of likelihood:</Text>
      <Bullets>
        <List.Item><b>Wind</b>: try the <Ui>Weather</Ui> air speed, or a manual wind. Gusty days can't be fixed afterwards.</List.Item>
        <List.Item><b>Power</b>: was the power meter zeroed? Are there dropouts (power reading 0 while pedalling)? A power meter reading 5 % high makes CdA at least 5 % too high.</List.Item>
        <List.Item><b>Mass</b>: rider in full kit plus the bike as ridden. Check the units in your <AppLink to='/profile'>profile</AppLink>.</List.Item>
        <List.Item><b>Air density</b>: 1.2 kg/m³ is only a default. Use the calculator; the difference between a cold day and a hot day at altitude can be 15 %.</List.Item>
        <List.Item><b>Speed</b>: GPS speed is noisy. Use a wheel or hub speed sensor.</List.Item>
        <List.Item><b>Crr</b>: with a closure fit, a wrong Crr shifts CdA (see below).</List.Item>
        <List.Item><b>The selection</b>: braking, stops, or a stretch out of position inside the selected range.</List.Item>
      </Bullets>

      <H2 id='crr'>CdA changes a lot when I change Crr</H2>
      <Text>
        That's expected for a single closed run: one closure can't tell rolling resistance from drag, so any error in Crr moves CdA.
        Use a good Crr for your tyres and surface, and keep it the same across tests you compare. To measure Crr, ride loops at clearly
        different speeds and fit both (see <GuideLink to='analysis#crr'>Fitting Crr too</GuideLink>).
      </Text>

      <H2 id='drift'>The virtual elevation drifts or jumps</H2>
      <Bullets>
        <List.Item><b>Steady drift</b> one way: CdA or Crr is off. Use <Ui>Suggest CdA</Ui>.</List.Item>
        <List.Item><b>A sudden step</b>: braking, a power dropout, a speed sensor glitch, or a car passing close. Select around it.</List.Item>
        <List.Item><b>Up one way, down the other</b> on an out and back: wind. Choose an air speed source with wind.</List.Item>
        <List.Item><b>Different from the recorded elevation but closing well</b>: the recorded elevation may be wrong (GPS altitude, or a barometric altimeter drifting with the weather). Prefer closure fits.</List.Item>
      </Bullets>

      <H2 id='data'>Gaps, pauses and spikes</H2>
      <Bullets>
        <List.Item>Gaps longer than 10 seconds (auto-pause, dropouts, smart recording) are treated as pauses: the virtual elevation follows the recorded elevation across them instead of integrating one reading over the gap.</List.Item>
        <List.Item>Power readings above 1,500 W are treated as sensor spikes and replaced with the average of the previous few seconds.</List.Item>
        <List.Item>Set your device to 1-second recording to avoid most of this.</List.Item>
      </Bullets>

      <H2 id='no-tests'>The Tests table finds nothing, or the wrong laps</H2>
      <Bullets>
        <List.Item>Pairing needs GPS and laps: press the lap button at the start and end of each leg.</List.Item>
        <List.Item>Legs must be at least 300 m and of similar length, the back leg must return close to where the out leg started, and at most 4 laps may sit between them.</List.Item>
        <List.Item>An out and back recorded as one lap counts as a closed lap: it's found only on rides without other pairs. Add it as a test yourself if needed.</List.Item>
        <List.Item>You can always correct the list by hand (see <GuideLink to='tests#editing'>Correcting the list</GuideLink>).</List.Item>
      </Bullets>

      <H2 id='upload'>My upload failed</H2>
      <Bullets>
        <List.Item>Click the red <Ui>Error</Ui> badge to see why. The most common reasons are a file without power or speed, or a file that isn't a cycling FIT or CSV file.</List.Item>
        <List.Item>Upload the original FIT file rather than a GPX or TCX export.</List.Item>
        <List.Item>Activities that failed long ago may work now: use <Ui>Retry processing</Ui>.</List.Item>
        <List.Item>For CSV files, check the <GuideLink to='reference#csv'>column format</GuideLink>.</List.Item>
      </Bullets>

      <H2 id='weather'>The weather wind looks wrong</H2>
      <Text>
        Weather models give the average wind over an area, at 10 m, by the hour. Near hills, buildings or water the local wind can be
        quite different. If you measured or observed the wind, enter it as a <Ui>Manual</Ui> wind, and set the ride's{' '}
        <GuideLink to='analysis#exposure'>wind exposure</GuideLink> to match the course.
      </Text>
    </>
  )
}
