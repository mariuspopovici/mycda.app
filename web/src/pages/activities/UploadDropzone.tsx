import { useState } from 'react'
import { Link } from 'react-router'
import { Anchor, Group, Progress, Stack, Text } from '@mantine/core'
import { Dropzone, type FileRejection } from '@mantine/dropzone'
import { notifications } from '@mantine/notifications'
import { IconCloudUpload, IconFileX, IconUpload } from '@tabler/icons-react'
import { uploadActivity } from '../../data/activities'

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const ACCEPTED = ['.fit', '.csv', '.gz', '.zip']

interface Upload {
  name: string
  progress: number
}

/** Accepts .FIT/.CSV files (also gzipped or zipped) and uploads each as a new activity. */
export function UploadDropzone ({ uid }: { uid: string }) {
  const [uploads, setUploads] = useState<Record<string, Upload>>({})

  const upload = async (file: File) => {
    const key = `${file.name}-${file.size}-${Date.now()}`
    const update = (progress: number) => setUploads((u) => ({ ...u, [key]: { name: file.name, progress } }))
    update(0)
    try {
      await uploadActivity(uid, file, update)
    } catch (error) {
      notifications.show({ color: 'red', title: `Couldn't upload ${file.name}`, message: (error as Error).message })
    } finally {
      setUploads((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
    }
  }

  const reject = (rejections: FileRejection[]) => rejections.forEach(({ file, errors }) => notifications.show({
    color: 'red',
    title: `${file.name} wasn't uploaded`,
    message: errors[0]?.code === 'file-too-large'
      ? `Files can be up to ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`
      : 'Upload a .FIT or .CSV file (it may be gzipped or zipped).'
  }))

  return (
    <Stack gap='xs'>
      <Dropzone
        onDrop={(files) => files.forEach(upload)}
        onReject={reject}
        maxSize={MAX_UPLOAD_BYTES}
        accept={{ 'application/octet-stream': ACCEPTED, 'text/csv': ['.csv'], 'application/gzip': ['.gz'], 'application/zip': ['.zip'] }}
      >
        <Group justify='center' gap='lg' mih={120} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept><IconUpload size={44} stroke={1.5} /></Dropzone.Accept>
          <Dropzone.Reject><IconFileX size={44} stroke={1.5} /></Dropzone.Reject>
          <Dropzone.Idle><IconCloudUpload size={44} stroke={1.5} /></Dropzone.Idle>
          <div>
            <Text size='lg'>Drop .FIT or .CSV files here, or click to choose</Text>
            <Text size='sm' c='dimmed'>Gzipped and zipped files work too. Each file becomes a new activity.</Text>
          </div>
        </Group>
      </Dropzone>
      <Text size='xs' c='dimmed'>
        Using a CSV? See the <Anchor component={Link} to='/faq#csv' size='xs'>column format</Anchor>.
      </Text>
      {Object.entries(uploads).map(([key, { name, progress }]) => (
        <div key={key}>
          <Text size='sm'>Uploading {name}</Text>
          <Progress value={progress * 100} animated aria-label={`Uploading ${name}`} />
        </div>
      ))}
    </Stack>
  )
}
