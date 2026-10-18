import { useMemo } from 'react'
import { useMantineTheme } from '@mantine/core'
import type { Data, Layout, Shape } from 'plotly.js'
import { PlotlyChart } from '../../components/PlotlyChart'
import type { IndexRange } from '../../core/selection'
import { kmToMi, mToFt, type Units } from '../../core/units'
import { distanceUnit, speedUnit } from '../../lib/format'

interface Props {
  time: Date[]
  /** km along the analysed run (continuous across joins) */
  distance: number[]
  /** m */
  elevation: number[]
  /** m */
  ve: number[]
  /** km/h; shown when given */
  airspeed?: number[]
  units: Units
  xAxis: 'time' | 'distance'
  showElevation: boolean
  bands: Array<IndexRange & { label: string }>
  /** Indexes where joined ranges meet; drawn as dashed lines. */
  joins?: number[]
  onHover?: (index: number | undefined) => void
}

/** Virtual elevation against recorded elevation on one axis, so drift shows directly. */
export function VirtualElevationChart ({ time, distance, elevation, ve, airspeed, units, xAxis, showElevation, bands, joins = [], onHover }: Props) {
  const theme = useMantineTheme()
  const metric = units === 'metric'
  const height = (m: number) => (metric ? m : mToFt(m))

  const x = useMemo(() => (xAxis === 'time' ? time : distance.map((d) => (metric ? d : kmToMi(d)))), [xAxis, time, distance, metric])

  const data = useMemo<Data[]>(() => {
    const traces: Data[] = []
    if (showElevation) {
      traces.push({ x, y: elevation.map(height), name: 'Recorded elevation', type: 'scatter', mode: 'lines', line: { width: 2, color: theme.colors.gray[5] } })
    }
    traces.push({ x, y: ve.map(height), name: 'Virtual elevation', type: 'scatter', mode: 'lines', line: { width: 2, color: theme.colors.blue[6] } })
    if (airspeed) {
      traces.push({
        x, y: airspeed.map((s) => (metric ? s : kmToMi(s))), name: 'Air speed', yaxis: 'y2', type: 'scatter', mode: 'lines',
        line: { width: 1, color: theme.colors.teal[5], dash: 'dot' }
      })
    }
    return traces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, elevation, ve, airspeed, showElevation, metric, theme])

  const layout = useMemo<Partial<Layout>>(() => {
    const at = (i: number) => {
      const v = x[Math.min(i, x.length - 1)]
      return v instanceof Date ? v.getTime() : v
    }
    const shapes: Partial<Shape>[] = bands.map((band, k) => ({
      type: 'rect', xref: 'x', yref: 'paper', x0: at(band.start), x1: at(band.end), y0: 0, y1: 1,
      fillcolor: k % 2 ? theme.colors.violet[3] : theme.colors.violet[5], opacity: 0.12, line: { width: 0 }, layer: 'below'
    }))
    joins.forEach((i) => shapes.push({
      type: 'line', xref: 'x', yref: 'paper', x0: at(i), x1: at(i), y0: 0, y1: 1,
      line: { width: 1, dash: 'dash', color: theme.colors.gray[6] }
    }))
    return {
      hovermode: 'x unified',
      dragmode: 'zoom',
      // keep the user's zoom while CdA and the other parameters change
      uirevision: xAxis,
      shapes,
      annotations: bands.map((band) => ({
        x: at(band.start), y: 1, xref: 'x', yref: 'paper', text: band.label, showarrow: false, xanchor: 'left', yanchor: 'top', font: { size: 10 }
      })),
      xaxis: { title: { text: xAxis === 'time' ? '' : `Distance (${distanceUnit(units)})` }, type: xAxis === 'time' ? 'date' : 'linear' },
      yaxis: { title: { text: `Elevation (${metric ? 'm' : 'ft'})` } },
      ...(airspeed ? { yaxis2: { title: { text: `Air speed (${speedUnit(units)})` }, overlaying: 'y', side: 'right', showgrid: false } } : {})
    }
  }, [bands, joins, x, xAxis, units, metric, airspeed, theme])

  return (
    <PlotlyChart data={data} layout={layout} height={420} onHover={onHover}
      ariaLabel='Virtual elevation compared with recorded elevation. With the right CdA and Crr the two match, and each loop returns to its starting height.' />
  )
}
