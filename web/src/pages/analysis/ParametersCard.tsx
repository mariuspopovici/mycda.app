import { useState } from 'react'
import { ActionIcon, Button, Card, Checkbox, Group, Menu, Modal, Slider, Stack, Text, Tooltip } from '@mantine/core'
import { IconCalculator, IconSparkles } from '@tabler/icons-react'
import { AirDensityCalculator, type WeatherContext } from '../../components/AirDensityCalculator'
import { DraftNumberInput } from '../../components/DraftNumberInput'
import { kgPerM3ToLbPerFt3, kgToLbs, lbPerFt3ToKgPerM3, lbsToKg, type Units } from '../../core/units'

/** Analysis parameters, always metric: mass kg, rho kg/m³, dloss %. */
export interface Parameters {
  mass: number
  rho: number
  crr: number
  cda: number
  dloss: number
}

export type FitTargetKey = 'run' | 'loops' | 'elevation'
export type FitRequest = { target: FitTargetKey, fitCrr: boolean }

export interface FitOption {
  key: FitTargetKey
  label: string
  disabled?: boolean
}

/** The fitted starting point of the analysis. */
export interface Suggestion {
  cda: number
  /** How it was fitted, e.g. "closure of the run". */
  basis: string
}

interface Props {
  value: Parameters
  units: Units
  onChange: (value: Parameters) => void
  onFit: (request: FitRequest) => void
  fitOptions: FitOption[]
  suggestion?: Suggestion
  weatherContext?: WeatherContext
}

const CDA_SLIDER: [number, number] = [0.1, 0.6]

export function ParametersCard ({ value, units, onChange, onFit, fitOptions, suggestion, weatherContext }: Props) {
  const metric = units === 'metric'
  const [calculatorOpen, setCalculatorOpen] = useState(false)
  const [fitCrr, setFitCrr] = useState(false)
  const set = (patch: Partial<Parameters>) => onChange({ ...value, ...patch })

  return (
    <Card withBorder padding='lg'>
      <Stack gap='sm'>
        <DraftNumberInput
          label={`Total mass (${metric ? 'kg' : 'lbs'})`} description='Rider and bike, as tested'
          value={Math.round((metric ? value.mass : kgToLbs(value.mass)) * 10) / 10} decimalScale={1} step={0.5}
          min={metric ? 30 : 66} max={metric ? 300 : 660}
          onCommit={(n) => set({ mass: metric ? n : lbsToKg(n) })}
        />
        <DraftNumberInput
          label={`Air density (${metric ? 'kg/m³' : 'lb/ft³'})`}
          value={metric ? Math.round(value.rho * 1e4) / 1e4 : Math.round(kgPerM3ToLbPerFt3(value.rho) * 1e5) / 1e5}
          decimalScale={metric ? 4 : 5} step={metric ? 0.001 : 0.0001}
          min={metric ? 0.5 : 0.03} max={metric ? 1.5 : 0.095}
          onCommit={(n) => set({ rho: metric ? n : lbPerFt3ToKgPerM3(n) })}
          rightSection={(
            <Tooltip label='Air density calculator'>
              <ActionIcon variant='subtle' onClick={() => setCalculatorOpen(true)} aria-label='Open the air density calculator'>
                <IconCalculator size={18} />
              </ActionIcon>
            </Tooltip>
          )}
        />
        <DraftNumberInput label='Crr' value={value.crr} decimalScale={4} step={0.0005} min={0} max={0.05}
          onCommit={(crr) => set({ crr })} />
        <DraftNumberInput label='Drivetrain loss (%)' value={value.dloss} decimalScale={1} step={0.5} min={0} max={10}
          onCommit={(dloss) => set({ dloss })} />
        <div>
          <Group justify='space-between' align='flex-end' mb={4}>
            <Text size='sm' fw={500}>CdA (m²)</Text>
            <DraftNumberInput size='xs' w={110} value={Math.round(value.cda * 1000) / 1000} decimalScale={3} fixedDecimalScale step={0.001} aria-label='CdA'
              min={0.01} max={1.5} onCommit={(cda) => set({ cda })} />
          </Group>
          <Slider min={CDA_SLIDER[0]} max={CDA_SLIDER[1]} step={0.001} value={Math.min(Math.max(value.cda, CDA_SLIDER[0]), CDA_SLIDER[1])}
            onChange={(cda) => set({ cda })} label={(v) => v.toFixed(3)} aria-label='CdA slider' />
        </div>
        <Group gap='xs' mt='xs'>
          <Menu position='bottom-start'>
            <Menu.Target>
              <Button variant='light' leftSection={<IconSparkles size={16} />}>Suggest CdA</Button>
            </Menu.Target>
            <Menu.Dropdown>
              {fitOptions.map((option) => (
                <Menu.Item key={option.key} disabled={option.disabled} onClick={() => onFit({ target: option.key, fitCrr })}>
                  {option.label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
          <Checkbox size='xs' label='Fit Crr too' checked={fitCrr} onChange={(e) => setFitCrr(e.currentTarget.checked)} />
        </Group>
        {suggestion && (
          // stacked: the card is narrow, and the note wraps
          <Stack gap={4} align='flex-start'>
            <Text size='xs' c='dimmed'>Suggested CdA {suggestion.cda.toFixed(3)} from {suggestion.basis}.</Text>
            {Math.abs(value.cda - suggestion.cda) > 0.0005 && (
              <Button size='compact-xs' variant='light' onClick={() => set({ cda: suggestion.cda })}>
                Reset to {suggestion.cda.toFixed(3)}
              </Button>
            )}
          </Stack>
        )}
      </Stack>

      <Modal opened={calculatorOpen} onClose={() => setCalculatorOpen(false)} title='Air density calculator' size='lg'>
        <AirDensityCalculator units={units} context={weatherContext}
          onUse={(rho) => { set({ rho }); setCalculatorOpen(false) }} />
      </Modal>
    </Card>
  )
}
