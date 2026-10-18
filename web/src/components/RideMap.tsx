import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { latLngBounds, type LatLngTuple } from 'leaflet'
import { useComputedColorScheme, useMantineTheme } from '@mantine/core'
import type { Track } from '../core/windModel'
import { trackSegments } from '../lib/track'

function FitBounds ({ points }: { points: LatLngTuple[] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(latLngBounds(points), { padding: [24, 24] })
  }, [map, points])
  return null
}

export interface RideMapProps {
  track: Track
  /** Index ranges to highlight. */
  selection?: Array<{ start: number, end: number }>
  /** Index of a point to mark, e.g. the one hovered on a chart. */
  marker?: number
  height?: number
}

/** The ride's GPS track on OpenStreetMap tiles (ADR-0004), with the selected range highlighted. */
export function RideMap ({ track, selection, marker, height = 360 }: RideMapProps) {
  const theme = useMantineTheme()
  const dark = useComputedColorScheme('light') === 'dark'
  const segments = useMemo(() => trackSegments(track), [track])
  const selected = useMemo(() => (selection ?? []).flatMap((r) => trackSegments(track, r.start, r.end)), [track, selection])
  const all = useMemo(() => segments.flat(), [segments])
  const focus = useMemo(() => (selected.length ? selected.flat() : all), [selected, all])

  if (all.length === 0) return null
  const first = all[0]
  const last = all[all.length - 1]

  return (
    <MapContainer
      center={first}
      zoom={14}
      scrollWheelZoom={false}
      style={{ height, borderRadius: 'var(--mantine-radius-md)', filter: dark ? 'brightness(0.8) contrast(1.1)' : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url='https://tile.openstreetmap.org/{z}/{x}/{y}.png'
        maxZoom={19}
      />
      {segments.map((positions, i) => (
        <Polyline key={`t${i}`} positions={positions} pathOptions={{ color: theme.colors.gray[6], weight: 4, opacity: selected.length ? 0.6 : 0.9 }} />
      ))}
      {selected.map((positions, i) => (
        <Polyline key={`s${i}`} positions={positions} pathOptions={{ color: theme.colors.orange[6], weight: 5 }} />
      ))}
      <CircleMarker center={first} radius={7} pathOptions={{ color: 'white', weight: 2, fillColor: theme.colors.green[6], fillOpacity: 1 }}>
        <Tooltip>Start</Tooltip>
      </CircleMarker>
      <CircleMarker center={last} radius={7} pathOptions={{ color: 'white', weight: 2, fillColor: theme.colors.red[6], fillOpacity: 1 }}>
        <Tooltip>Finish</Tooltip>
      </CircleMarker>
      {marker !== undefined && track[marker] && (
        <CircleMarker center={[track[marker]!.lat, track[marker]!.lng]} radius={6} pathOptions={{ color: theme.colors.dark[7], weight: 2, fillColor: 'white', fillOpacity: 1 }} />
      )}
      <FitBounds points={focus} />
    </MapContainer>
  )
}
