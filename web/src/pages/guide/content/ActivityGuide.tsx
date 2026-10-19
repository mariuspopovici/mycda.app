import { List, Text } from '@mantine/core'
import { AppLink, Bullets, GuideLink, H2, H3, Steps, Tip, Ui } from '../parts'

export function ActivityGuide () {
  return (
    <>
      <Text>
        Opening an activity shows the whole ride: a chart of power, speed and elevation, a map, and three tabs below them:{' '}
        <Ui>Tests</Ui>, <Ui>Laps</Ui> and <Ui>Saved analyses</Ui>. From here you choose what to analyze.
      </Text>

      <H2 id='overview'>Finding your way around</H2>
      <Bullets>
        <List.Item>
          The line under the ride's name sums it up, for example "10 tests found · 43 laps · 3 saved analyses · Ride settings: mass".
          Click any part to jump to its tab, or to open the ride settings.
        </List.Item>
        <List.Item>
          The tabs open on <Ui>Tests</Ui> when MyCdA found tests in the laps, and on <Ui>Laps</Ui> otherwise. The tab you pick is
          kept in the page's address, so going back from an analysis returns to it.
        </List.Item>
        <List.Item>The <Ui>Ride settings</Ui> button at the top right opens the ride's settings in a side panel; its badge counts the values set for this ride.</List.Item>
      </Bullets>

      <H2 id='chart'>The chart and the map</H2>
      <Bullets>
        <List.Item>The chart plots power, speed and elevation. Switch its axis between <Ui>Time</Ui> and <Ui>Distance</Ui>.</List.Item>
        <List.Item>Hover over the chart to see where you were on the map.</List.Item>
        <List.Item><Ui>Show laps</Ui> shades each lap on the chart; <Ui>Find loops</Ui> shades the loops found in the GPS track.</List.Item>
        <List.Item>The summary above the chart shows the whole ride, or the selection when there is one.</List.Item>
      </Bullets>

      <H2 id='selecting'>Selecting what to analyze</H2>
      <Text>There are four ways to choose a part of the ride:</Text>
      <H3>Drag across the chart</H3>
      <Text>
        Drag over a stretch of the chart to select it. The map highlights it, and the summary shows its duration, distance, speed
        and power. Drag again to change it, or press <Ui>Clear</Ui>.
      </Text>
      <H3>Pick a lap</H3>
      <Text>In the <Ui>Laps</Ui> tab, click a row to select that lap.</Text>
      <H3>Join laps into one run</H3>
      <Text>
        Tick the checkboxes of several laps, for example the out and the back legs of a test, to analyze them as <b>one run</b>.
        The laps are joined in ride order, leaving out what's between them (the turnaround), and the virtual elevation holds level
        at each join, so the speed change between legs isn't mistaken for a climb or a descent. The button changes to{' '}
        <Ui>Analyze 2 as one run</Ui>.
      </Text>
      <H3>Select loops</H3>
      <Text>
        Turn on <Ui>Find loops</Ui> to detect the laps of a circuit from the GPS track, even if you didn't press the lap button,
        then <Ui>Select all loops</Ui>. If too few or too many are found, open the loop settings next to the switch:
      </Text>
      <Bullets>
        <List.Item><b>Matching precision</b>: how close the track must pass its starting point to count as a loop, from ~110 m (forgiving) to ~1 m (strict).</List.Item>
        <List.Item><b>Loop duration</b>: the shortest and longest loop, in seconds, to ignore stops and detours.</List.Item>
      </Bullets>
      <Text>
        Then press <Ui>Analyze selection</Ui> to open the analysis (see <GuideLink to='analysis'>Analyzing a run</GuideLink>).
        For rides with several out and back tests, the <GuideLink to='tests'>Tests table</GuideLink> does the selecting for you.
      </Text>

      <H2 id='ride-settings'>Ride settings</H2>
      <Text>
        Your profile holds your usual values. <Ui>Ride settings</Ui>, opened from the button at the top right of the activity
        page, hold the ones that apply to this ride only, for every analysis of it, for example when you rode another bike, in
        different kit, or on a cold day:
      </Text>
      <Bullets>
        <List.Item><b>Total mass</b>: rider and bike together, as ridden that day.</List.Item>
        <List.Item><b>Air density</b>: the calculator button next to it looks up the weather where and when you rode (see <GuideLink to='analysis#air-density'>Air density</GuideLink>).</List.Item>
        <List.Item><b>Crr</b> and <b>drivetrain loss</b>, for other tyres, surfaces or power meters.</List.Item>
        <List.Item><b>Wind exposure</b>: how sheltered the course is, used to estimate the wind at rider height (see <GuideLink to='analysis#airspeed'>Air speed</GuideLink>).</List.Item>
        <List.Item><b>Notes</b>: conditions, course, equipment. Notes are searchable from the activity list.</List.Item>
      </Bullets>
      <Text>
        Leave a field empty to use your profile's value; the placeholder shows what that is. <Ui>Save ride settings</Ui> saves
        them and closes the panel; closing it without saving discards the changes.
      </Text>
      <Tip title='Where starting values come from'>
        A new analysis starts from the ride settings, then your <AppLink to='/profile'>profile</AppLink> for anything left empty.
        Saved analyses keep their own values. Changing the ride settings affects analyses you open afterwards, not those already
        saved.
      </Tip>

      <H2 id='saved'>Saved analyses</H2>
      <Text>
        The <Ui>Saved analyses</Ui> tab lists the ride's saved analyses with their CdA and Crr, the mean, standard deviation and coefficient
        of variation of their CdA, and how each compares with the ride's baseline. Click a name to open it, the target button to
        show its range on the chart, or the bin to delete it. See <GuideLink to='comparing'>Comparing setups</GuideLink>.
      </Text>
      <Steps>
        <List.Item>Pick your test runs (laps, a range, or the Tests table).</List.Item>
        <List.Item>Check them in the analysis and save each one.</List.Item>
        <List.Item>Mark one as the baseline to compare the others with it.</List.Item>
      </Steps>
    </>
  )
}
