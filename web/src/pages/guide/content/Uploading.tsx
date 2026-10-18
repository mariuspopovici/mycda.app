import { Badge, List, Table, Text } from '@mantine/core'
import { AppLink, Bullets, GuideLink, H2, Steps, Tip, Ui } from '../parts'

export function Uploading () {
  return (
    <>
      <H2 id='files'>Supported files</H2>
      <Bullets>
        <List.Item>
          <b>FIT files</b> from Garmin, Wahoo, Hammerhead, Bryton and most other head units. Files that import into Garmin Connect,
          TrainingPeaks or Strava generally work. Upload the original file, as exported from the device or the website.
        </List.Item>
        <List.Item>Gzipped FIT files (<code>.fit.gz</code>, as some services export them) and zip downloads from Garmin Connect.</List.Item>
        <List.Item><b>CSV files</b>, for data from older devices, spreadsheets or extra sensors. See the <GuideLink to='reference#csv'>CSV format</GuideLink>.</List.Item>
      </Bullets>
      <Text>
        The file needs speed for most of the ride, and power for the analysis. GPX, TCX and PWX files aren't supported: they leave
        out data the analysis needs. Each file can be up to 25 MB.
      </Text>

      <H2 id='upload'>Uploading</H2>
      <Steps>
        <List.Item>Open <AppLink to='/activities'>Activities</AppLink>.</List.Item>
        <List.Item>Drop one or more files on the upload area, or click it to choose them. Each file becomes an activity named after the file.</List.Item>
        <List.Item>Wait a few seconds while it's processed, then click its name to open it.</List.Item>
      </Steps>

      <H2 id='status'>Processing status</H2>
      <Table withTableBorder>
        <Table.Tbody>
          <Table.Tr><Table.Td w={130}><Badge color='gray' variant='light'>Processing</Badge></Table.Td><Table.Td>The file is being read. This usually takes a few seconds.</Table.Td></Table.Tr>
          <Table.Tr><Table.Td><Badge color='green' variant='light'>Ready</Badge></Table.Td><Table.Td>Open it and start analyzing.</Table.Td></Table.Tr>
          <Table.Tr><Table.Td><Badge color='red' variant='light'>Error</Badge></Table.Td><Table.Td>The file couldn't be used. Click the badge to see why, for example missing power or speed.</Table.Td></Table.Tr>
          <Table.Tr><Table.Td><Badge color='orange' variant='light'>Stalled</Badge></Table.Td><Table.Td>Processing didn't finish, for example because the upload was interrupted. Retry it, or delete it and upload again.</Table.Td></Table.Tr>
        </Table.Tbody>
      </Table>
      <Text>
        Failed and stalled activities have a <Ui>Retry processing</Ui> button. When several need attention, a banner above the list
        offers <Ui>Retry all</Ui>. Retrying is worth it for files that failed a while ago: the file reader has improved, and older
        errors are often fixed.
      </Text>

      <H2 id='list'>The activity list</H2>
      <Bullets>
        <List.Item><b>Sort</b>: <Ui>Recently uploaded</Ui> (the default, so new uploads appear at the top), <Ui>Ride date</Ui> newest or oldest first, or <Ui>Name</Ui>. Your choice is remembered in this browser.</List.Item>
        <List.Item><b>Search</b> matches activity names and ride notes. Every word you type must match, in any order, ignoring case and accents.</List.Item>
        <List.Item><b>Rename</b> an activity with the pencil button. Good names (course, setup, date) make search more useful.</List.Item>
        <List.Item><b>Delete</b> removes the activity, its uploaded file and all its saved analyses. It can't be undone.</List.Item>
      </Bullets>
      <Tip>
        Write the setup you tested in the ride's notes (<GuideLink to='activity#ride-settings'>Ride settings</GuideLink>), for
        example "TT bike, new helmet, 6 °C". Search finds notes too, so you can pull up every ride with a given helmet later.
      </Tip>
    </>
  )
}
