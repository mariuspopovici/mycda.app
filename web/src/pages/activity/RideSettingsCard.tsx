import { useState } from 'react'
import { ActionIcon, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Text, Textarea, Title, Tooltip } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCalculator } from '@tabler/icons-react'
import { AirDensityCalculator, type WeatherContext } from '../../components/AirDensityCalculator'
import { kgPerM3ToLbPerFt3, kgToLbs, lbPerFt3ToKgPerM3, lbsToKg } from '../../core/units'
import { riderHeightFactor, WIND_EXPOSURES, type WindExposure } from '../../core/windModel'
import { DEFAULT_WIND_EXPOSURE, isWindExposure, saveRideSettings, type Activity, type RideDefaults } from '../../data/activities'
import { EXPOSURE_LABELS } from '../analysis/windExposure'
import { totalMassKg, type UserPrefs } from '../../data/userPrefs'

type Field = number | string

interface Draft {
  notes: string
  mass: Field
  rho: Field
  crr: Field
  dloss: Field
  windExposure: WindExposure | ''
}

const exposureOptions = WIND_EXPOSURES.map((value) => ({
  value,
  label: `${EXPOSURE_LABELS[value].name}: ${EXPOSURE_LABELS[value].description} (×${riderHeightFactor(value).toFixed(2)})`
}))

const parsed = (v: Field) => {
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

/**
 * Notes about the ride, and analysis parameters that apply to every analysis of it (they override
 * the profile; empty fields fall back to it).
 */
export function RideSettingsCard ({ activity, prefs, weatherContext }: { activity: Activity, prefs: UserPrefs, weatherContext?: WeatherContext }) {
  const metric = prefs.units === 'metric'
  const toDraft = (a: Activity): Draft => {
    const d = a.analysisDefaults ?? {}
    return {
      notes: a.notes ?? '',
      mass: d.mass === undefined ? '' : Math.round((metric ? d.mass : kgToLbs(d.mass)) * 10) / 10,
      rho: d.rho === undefined ? '' : metric ? d.rho : Math.round(kgPerM3ToLbPerFt3(d.rho) * 1e5) / 1e5,
      crr: d.crr ?? '',
      dloss: d.dloss ?? '',
      windExposure: d.windExposure ?? ''
    }
  }
  const [draft, setDraft] = useState<Draft>(() => toDraft(activity))
  const [saving, setSaving] = useState(false)
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }))

  const defaults = (): RideDefaults => {
    const mass = parsed(draft.mass)
    const rho = parsed(draft.rho)
    return {
      mass: mass === undefined ? undefined : metric ? mass : lbsToKg(mass),
      rho: rho === undefined ? undefined : metric ? rho : lbPerFt3ToKgPerM3(rho),
      crr: parsed(draft.crr),
      dloss: parsed(draft.dloss),
      windExposure: draft.windExposure || undefined
    }
  }
  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(activity))

  const save = async () => {
    setSaving(true)
    try {
      await saveRideSettings(activity.id, { notes: draft.notes.trim(), analysisDefaults: defaults() })
      notifications.show({ color: 'green', message: 'Ride settings saved. New analyses of this ride start from them.' })
    } catch (e) {
      notifications.show({ color: 'red', title: "Couldn't save the ride settings", message: (e as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const profileMass = totalMassKg(prefs)
  return (
    <Card withBorder padding='lg'>
      <Title order={3} mb={4}>Ride settings</Title>
      <Text size='sm' c='dimmed' mb='md'>
        Parameters for every analysis of this ride, for example when you rode a different bike or kit. Leave a field empty to use your profile.
      </Text>
      <Stack gap='sm'>
        <SimpleGrid cols={{ base: 1, xs: 2 }}>
          <NumberInput label={`Total mass (${metric ? 'kg' : 'lbs'})`} decimalScale={1} step={0.5} min={0}
            placeholder={`Profile: ${(metric ? profileMass : kgToLbs(profileMass)).toFixed(1)}`}
            value={draft.mass} onChange={(mass) => set({ mass })} />
          <NumberInput label={`Air density (${metric ? 'kg/m³' : 'lb/ft³'})`} decimalScale={metric ? 4 : 5} step={metric ? 0.001 : 0.0001} min={0}
            placeholder='Default: 1.2 kg/m³' value={draft.rho} onChange={(rho) => set({ rho })}
            rightSection={(
              <Tooltip label='Air density calculator'>
                <ActionIcon variant='subtle' onClick={() => setCalculatorOpen(true)} aria-label='Open the air density calculator'>
                  <IconCalculator size={18} />
                </ActionIcon>
              </Tooltip>
            )} />
          <NumberInput label='Crr' decimalScale={4} step={0.0005} min={0} placeholder={`Profile: ${prefs.crr}`}
            value={draft.crr} onChange={(crr) => set({ crr })} />
          <NumberInput label='Drivetrain loss (%)' decimalScale={1} step={0.5} min={0} max={10} placeholder={`Profile: ${prefs.dloss}`}
            value={draft.dloss} onChange={(dloss) => set({ dloss })} />
        </SimpleGrid>
        <Select label='Wind exposure' clearable data={exposureOptions}
          description='How sheltered the course is. Weather and forecast winds are measured at 10 m; this scales them to rider height.'
          placeholder={`Default: ${EXPOSURE_LABELS[DEFAULT_WIND_EXPOSURE].name.toLowerCase()}`}
          value={draft.windExposure || null} onChange={(v) => set({ windExposure: isWindExposure(v) ? v : '' })} />
        <Textarea label='Notes' autosize minRows={2} maxRows={8}
          placeholder='Conditions, course, equipment, anything that applies to the whole ride…'
          value={draft.notes} onChange={(e) => set({ notes: e.currentTarget.value })} />
        <Group justify='flex-end'>
          <Button variant='light' onClick={save} loading={saving} disabled={!dirty}>Save ride settings</Button>
        </Group>
      </Stack>
      <Modal opened={calculatorOpen} onClose={() => setCalculatorOpen(false)} title='Air density calculator' size='lg'>
        <AirDensityCalculator units={prefs.units} context={weatherContext}
          onUse={(rho) => { set({ rho: metric ? Math.round(rho * 1e4) / 1e4 : Math.round(kgPerM3ToLbPerFt3(rho) * 1e5) / 1e5 }); setCalculatorOpen(false) }} />
      </Modal>
    </Card>
  )
}
