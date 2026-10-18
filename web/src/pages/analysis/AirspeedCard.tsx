import type { ReactNode } from 'react'
import { Card, Checkbox, Group, SegmentedControl, Stack, Text } from '@mantine/core'
import { DraftNumberInput } from '../../components/DraftNumberInput'
import { kmToMi, miToKm, type Units } from '../../core/units'
import { riderHeightFactor, type WindExposure } from '../../core/windModel'
import type { AirspeedSource, ManualWind } from '../../data/segments'
import { compassPoint, formatSpeed, speedUnit } from '../../lib/format'
import type { WindModelResult } from './useWindModel'
import { exposureSummary } from './windExposure'
import { HelpLink } from '../../components/HelpLink'

interface Props {
  source: AirspeedSource
  onSourceChange: (source: AirspeedSource) => void
  wind: ManualWind
  onWindChange: (wind: ManualWind) => void
  units: Units
  measuredAvailable: boolean
  /** Wind models need a GPS track for the direction of travel. */
  windPossible: boolean
  model: { isLoading: boolean, error: unknown, data?: WindModelResult }
  /** Scales 10 m winds to rider height. */
  exposure: WindExposure
  /** Where the exposure comes from, shown under weather and manual winds. */
  exposureNote?: ReactNode
}

/** Where air speed comes from: a sensor, still air, Open-Meteo wind, or a wind the user enters. */
export function AirspeedCard ({
  source, onSourceChange, wind, onWindChange, units, measuredAvailable, windPossible, model, exposure, exposureNote
}: Props) {
  const metric = units === 'metric'
  const factor = riderHeightFactor(exposure)
  return (
    <Card withBorder padding='lg'>
      <Group gap={4} mb={6}><Text size='sm' fw={500}>Air speed</Text><HelpLink to='analysis#airspeed' topic='Air speed' /></Group>
      <SegmentedControl fullWidth size='xs' value={source} onChange={(v) => onSourceChange(v as AirspeedSource)}
        data={[
          { label: 'Measured', value: 'measured', disabled: !measuredAvailable },
          { label: 'Still air', value: 'ground' },
          { label: 'Weather', value: 'wind', disabled: !windPossible },
          { label: 'Manual', value: 'manual', disabled: !windPossible }
        ]} />
      <Stack gap='xs' mt={8}>
        {source === 'measured' && <Text size='xs' c='dimmed'>Using the air speed recorded in the file.</Text>}
        {source === 'ground' && <Text size='xs' c='dimmed'>Air speed equals ground speed: best on windless days.</Text>}
        {source === 'wind' && (
          <Text size='xs' c='dimmed'>
            {model.isLoading
              ? 'Fetching hourly wind from Open-Meteo…'
              : model.error
                ? `Couldn't get the wind: ${(model.error as Error).message}`
                : model.data && (
                  `Wind ${formatSpeed(model.data.meanWindSpeed, units)} at 10 m from ${Math.round(model.data.windDirection)}° ` +
                  `(${compassPoint(model.data.windDirection)}), Open-Meteo ${model.data.source === 'archive' ? 'reanalysis' : 'forecast models'}: ` +
                  `about ${formatSpeed(model.data.meanWindSpeed * factor, units)} at rider height (${exposureSummary(exposure)}). Treat results as indicative.`
                )}
          </Text>
        )}
        {source === 'manual' && (
          <>
            <Group grow align='flex-start'>
              <DraftNumberInput size='xs' label={`Wind speed (${speedUnit(units)})`} decimalScale={1} step={0.5} min={0} max={metric ? 80 : 50}
                value={Math.round((metric ? wind.speed : kmToMi(wind.speed)) * 10) / 10}
                onCommit={(v) => onWindChange({ ...wind, speed: metric ? v : miToKm(v) })} />
              <DraftNumberInput size='xs' label={`From (° · ${compassPoint(wind.direction)})`} decimalScale={0} step={5} min={0} max={360}
                value={wind.direction} onCommit={(direction) => onWindChange({ ...wind, direction })} />
            </Group>
            <Checkbox size='xs' label='Measured at rider height' checked={!!wind.atRiderHeight}
              onChange={(e) => onWindChange({ ...wind, atRiderHeight: e.currentTarget.checked || undefined })} />
            <Text size='xs' c='dimmed'>
              The direction the wind blows from: 0° north, 90° east.{' '}
              {wind.atRiderHeight
                ? 'The speed is used as entered.'
                : `Forecasts and weather stations give the wind at 10 m: about ${formatSpeed(wind.speed * factor, units)} at rider height (${exposureSummary(exposure)}).`}
            </Text>
          </>
        )}
        {(source === 'wind' || (source === 'manual' && !wind.atRiderHeight)) && windPossible && exposureNote &&
          <Text size='xs' c='dimmed'>{exposureNote}</Text>}
        {!windPossible && <Text size='xs' c='dimmed'>Wind models need a GPS track for the direction of travel.</Text>}
      </Stack>
    </Card>
  )
}
