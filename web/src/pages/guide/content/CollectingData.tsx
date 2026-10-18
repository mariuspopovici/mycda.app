import { List, Table, Text } from '@mantine/core'
import { AppLink, Bullets, Caution, GuideLink, H2, H3, Steps, Tip } from '../parts'

export function CollectingData () {
  return (
    <>
      <Text>
        Good results come from good data. The method is sensitive: a 1 % error in power, speed or mass shows up as a similar error in
        CdA. Most of what makes a test repeatable happens before you upload anything.
      </Text>

      <H2 id='equipment'>What you need</H2>
      <Table withTableBorder>
        <Table.Tbody>
          {[
            ['Power meter', 'Required. Zero it (calibrate) before every test, with the bike at the temperature you will ride in.'],
            ['Speed sensor', 'Strongly recommended: a wheel or hub sensor. GPS speed is too noisy for this; most head units use the sensor when there is one.'],
            ['GPS', 'Recommended. It gives the map, finds out and back runs and loops automatically, and lets MyCdA model the wind.'],
            ['Elevation', "Helpful but not essential: a barometric altimeter is better than GPS altitude. Closing a loop doesn't depend on it much."],
            ['Air speed sensor', 'Optional. If your device records air speed (for example a pitot or wind sensor), MyCdA uses it directly.']
          ].map(([name, text]) => (
            <Table.Tr key={name}><Table.Td fw={600} w={150}>{name}</Table.Td><Table.Td>{text}</Table.Td></Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Text>
        Set your head unit to record <b>every second</b>, not "smart recording". Smart recording leaves gaps of several seconds; gaps
        over 10 seconds are treated as pauses and not integrated.
      </Text>

      <H2 id='course'>Choosing a course</H2>
      <Text>Any course works where you can ride steadily without braking and come back to where you started:</Text>
      <H3>Out and back</H3>
      <Text>
        Ride a straight road one way, turn around, and ride back. Wind that helps you one way slows you down the other, so an out and
        back cancels much of its effect, and you end where you started, which gives a clean check on the result. 1–3 km each way is
        typical. This is the most common choice, and the <GuideLink to='tests'>Tests table</GuideLink> is built around it.
      </Text>
      <H3>Loops</H3>
      <Text>
        A short circuit (300 m–1.5 km) ridden several times, for example around an industrial park or a car park. Every lap closes,
        so several laps give several checks. Ride different laps at different speeds: that's what separates CdA from Crr.
      </Text>
      <H3>Velodrome</H3>
      <Text>
        Indoors, without wind, a velodrome gives the most repeatable results. Keep to the same line (the black line) and remember a
        wooden track has a lower Crr than the road.
      </Text>
      <H3>Half pipe</H3>
      <Text>
        A dip ridden back and forth, rolling down one side and up the other. Good for comparing small changes, as long as you can turn
        safely at each end.
      </Text>
      <Caution title='Safety first'>
        Pick a road with little or no traffic, good sight lines and safe places to turn. Never hold an aero position where you
        can't see far enough ahead, and don't test in a group.
      </Caution>

      <H2 id='protocol'>A test protocol</H2>
      <Steps>
        <List.Item>Weigh yourself in full kit, and the bike as you will ride it. Enter both in your <AppLink to='/profile'>profile</AppLink>, or in the ride's settings if they differ.</List.Item>
        <List.Item>Warm up, then zero the power meter.</List.Item>
        <List.Item>Note the time, temperature, pressure and humidity (or dew point), or let MyCdA look them up later.</List.Item>
        <List.Item>Press the <b>lap button</b> as you start each run and as you finish it. Separate laps for the out and the back legs, with the turnaround in a lap of its own, let MyCdA pair them automatically.</List.Item>
        <List.Item>Ride each run in one position, at a steady effort, without braking or coasting. Don't stop pedalling for long.</List.Item>
        <List.Item>Turn around without braking hard, and start the next run from the same place each time.</List.Item>
        <List.Item>Repeat: at least 3–4 runs per setup. Alternate setups (A, B, A, B) rather than doing all of A first, so changes in the wind or temperature affect both alike.</List.Item>
        <List.Item>Record the whole session as <b>one file</b>.</List.Item>
      </Steps>
      <Tip title='Vary the speed'>
        If you want to estimate Crr as well, ride some runs or loops noticeably faster than others. Aerodynamic drag rises with the
        square of speed while rolling resistance doesn't, so different speeds pull the two apart.
      </Tip>

      <H2 id='weather'>Wind and weather</H2>
      <Bullets>
        <List.Item><b>Wind is the biggest source of error.</b> Test on the calmest day you can, ideally with less than 5 km/h (3 mph) of wind, early in the morning or in the evening.</List.Item>
        <List.Item>Gusts and changing wind can't be corrected afterwards. A steady wind on an out and back course largely cancels; MyCdA can also model it (see <GuideLink to='analysis#airspeed'>Air speed</GuideLink>).</List.Item>
        <List.Item>Air density changes with temperature, pressure and humidity, and with it the drag: on a hot day at altitude it can be 15 % lower than on a cold day at sea level. Use the same air density for runs on the same day, and the right one for each day when comparing days.</List.Item>
        <List.Item>
          When noting pressure, know which kind you have: weather reports and apps give <b>sea-level pressure</b> (around 1013 hPa
          or 29.92 inHg), while a barometer where you ride reads <b>station pressure</b>, lower at altitude. The{' '}
          <AppLink to='/rho'>air density calculator</AppLink> accepts either.
        </List.Item>
      </Bullets>
    </>
  )
}
