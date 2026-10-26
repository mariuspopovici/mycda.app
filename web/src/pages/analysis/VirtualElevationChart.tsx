import { useMemo } from 'react'
import { useMantineTheme } from '@mantine/core'
import type { Data, Layout, Shape } from 'plotly.js'
import { PlotlyChart } from '../../components/PlotlyChart'
import type { IndexRange } from '../../core/selection'
import { kmToMi, mToFt, type Units } from '../../core/units'
import { windKind, type WindArrow } from '../../core/windModel'
import { compassPoint, distanceUnit, formatSpeed, speedUnit } from '../../lib/format'

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
  /** The wind relative to the rider along the run, drawn as arrows along the top. */
  wind?: WindArrow[]
  onHover?: (index: number | undefined) => void
}

/** Virtual elevation against recorded elevation on one axis, so drift shows directly. */
export function VirtualElevationChart ({ time, distance, elevation, ve, airspeed, units, xAxis, showElevation, bands, joins = [], wind, onHover }: Props) {
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
    if (wind?.length) {
      // the chart reads left to right as the rider rides: an arrow pointing left blows into the rider
      // (headwind), right is a tailwind, up comes from the rider's right, down from the left
      traces.push({
        x: wind.map((w) => x[w.index]), y: wind.map(() => 0.92), yaxis: 'y3', name: 'Wind', type: 'scatter', mode: 'markers',
        marker: {
          symbol: 'arrow', angle: wind.map((w) => (w.relative + 270) % 360),
          size: wind.map((w) => 9 + Math.min(w.speed, 30) / 30 * 11), color: theme.colors.orange[6], line: { width: 0 }
        },
        hovertext: wind.map((w) => `${windKind(w.relative)} ${formatSpeed(w.speed, units)} · from ${compassPoint(w.direction)} (${Math.round(w.direction)}°) · yaw ${Math.round(Math.abs(w.yaw))}°`),
        hoverinfo: 'text'
      } as Data)
    }
    return traces
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x, elevation, ve, airspeed, wind, showElevation, metric, units, theme])

  // with wind arrows, the elevation axis leaves the top fifth of the plot free for them
  const headroom = useMemo(() => {
    const values = [...ve, ...(showElevation ? elevation : [])].map(height)
    let lo = Infinity; let hi = -Infinity
    for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v }
    const span = Math.max(hi - lo, 1)
    return [lo - span * 0.05, hi + span * 0.3]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ve, elevation, showElevation, metric])

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
      yaxis: { title: { text: `Elevation (${metric ? 'm' : 'ft'})` }, ...(wind?.length ? { range: headroom, autorange: false } : { autorange: true }) },
      ...(airspeed ? { yaxis2: { title: { text: `Air speed (${speedUnit(units)})` }, overlaying: 'y', side: 'right', showgrid: false } } : {}),
      // a fixed 0–1 band for the wind arrows, independent of elevation and zoom
      ...(wind?.length ? { yaxis3: { overlaying: 'y', range: [0, 1], autorange: false, visible: false, fixedrange: true } } : {})
    }
  }, [bands, joins, x, xAxis, units, metric, airspeed, wind, headroom, theme])

  return (
    <PlotlyChart data={data} layout={layout} height={420} onHover={onHover}
      ariaLabel='Virtual elevation compared with recorded elevation. With the right CdA and Crr the two match, and each loop returns to its starting height.' />
  )
}
