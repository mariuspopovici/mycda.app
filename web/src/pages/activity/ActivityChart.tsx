import { useMemo } from 'react'
import { useMantineTheme } from '@mantine/core'
import type { Data, Layout, PlotRelayoutEvent, Shape } from 'plotly.js'
import { PlotlyChart } from '../../components/PlotlyChart'
import type { ActivitySeries } from '../../core/activitySeries'
import type { IndexRange } from '../../core/selection'
import { kmToMi, mToFt, type Units } from '../../core/units'
import { distanceUnit, speedUnit } from '../../lib/format'

export type XAxis = 'time' | 'distance'

export interface Band extends IndexRange {
  label: string
}

interface Props {
  series: ActivitySeries
  units: Units
  xAxis: XAxis
  /** Selected ranges (several when laps are joined into a run). */
  selection?: IndexRange[]
  /** Laps or loops drawn as alternating bands. */
  bands?: Band[]
  onSelect: (from: number, to: number) => void
  onClear: () => void
  onHover?: (index: number | undefined) => void
}

/**
 * Power, speed and elevation over time or distance. Dragging zooms in, and the zoomed range becomes
 * the selection (Plotly's box select ignores line-only traces); double-click zooms out and clears it.
 */
export function ActivityChart ({ series, units, xAxis, selection, bands = [], onSelect, onClear, onHover }: Props) {
  const theme = useMantineTheme()
  const metric = units === 'metric'

  const x = useMemo(() => (xAxis === 'time'
    ? series.time
    : series.distance.map((d) => (metric ? d : kmToMi(d)))), [series, xAxis, metric])

  const data = useMemo<Data[]>(() => [
    {
      x, y: series.altitude.map((m) => (metric ? m : mToFt(m))), name: 'Elevation', yaxis: 'y2', type: 'scatter', mode: 'lines',
      fill: 'tozeroy', line: { width: 0, color: theme.colors.gray[5] }, fillcolor: 'rgba(134,142,150,0.25)', hoverinfo: 'y+name'
    },
    { x, y: series.power, name: 'Power', type: 'scatter', mode: 'lines', line: { width: 1, color: theme.colors.orange[6] } },
    {
      x, y: series.speed.map((s) => (metric ? s : kmToMi(s))), name: 'Speed', yaxis: 'y3', type: 'scatter', mode: 'lines',
      line: { width: 1, color: theme.colors.blue[6] }
    }
  ], [x, series, metric, theme])

  const shapes = useMemo<Partial<Shape>[]>(() => {
    // shapes need numbers: Date objects break Plotly's autorange
    const at = (i: number) => {
      const v = x[Math.min(i, x.length - 1)]
      return v instanceof Date ? v.getTime() : v
    }
    const result: Partial<Shape>[] = bands.map((band, k) => ({
      type: 'rect', xref: 'x', yref: 'paper', x0: at(band.start), x1: at(band.end), y0: 0, y1: 1,
      fillcolor: k % 2 ? theme.colors.violet[3] : theme.colors.violet[5], opacity: 0.12, line: { width: 0 }, layer: 'below'
    }))
    selection?.forEach((range) => result.push({
      type: 'rect', xref: 'x', yref: 'paper', x0: at(range.start), x1: at(range.end), y0: 0, y1: 1,
      fillcolor: theme.colors.yellow[4], opacity: 0.25, line: { width: 1, color: theme.colors.yellow[7] }
    }))
    return result
  }, [bands, selection, x, theme])

  const layout = useMemo<Partial<Layout>>(() => ({
    dragmode: 'zoom',
    hovermode: 'x unified',
    shapes,
    xaxis: { title: { text: xAxis === 'time' ? '' : `Distance (${distanceUnit(units)})` }, type: xAxis === 'time' ? 'date' : 'linear' },
    // zoom horizontally only
    yaxis: { title: { text: 'Power (W)' }, rangemode: 'tozero', fixedrange: true },
    yaxis2: { title: { text: `Elevation (${metric ? 'm' : 'ft'})` }, overlaying: 'y', side: 'right', showgrid: false, fixedrange: true },
    yaxis3: { title: { text: speedUnit(units) }, overlaying: 'y', side: 'right', showgrid: false, anchor: 'free', position: 1, visible: false, fixedrange: true }
  }), [shapes, xAxis, units, metric])

  const handleRelayout = (event: PlotRelayoutEvent) => {
    if (event['xaxis.autorange']) {
      onClear()
      return
    }
    const r0 = event['xaxis.range[0]']
    const r1 = event['xaxis.range[1]']
    if (r0 === undefined || r1 === undefined) return
    const toNumber = (v: unknown) => (xAxis === 'time' ? new Date(v as string).getTime() : Number(v))
    const km = (v: number) => (xAxis === 'distance' && !metric ? v * 1.609 : v)
    onSelect(km(toNumber(r0)), km(toNumber(r1)))
  }

  return (
    <PlotlyChart
      data={data}
      layout={layout}
      height={380}
      onRelayout={handleRelayout}
      onHover={onHover}
      ariaLabel='Power, speed and elevation for the ride. Drag across the chart to zoom in and select a range; double-click to zoom out.'
    />
  )
}
