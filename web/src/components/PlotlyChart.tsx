import { useEffect, useRef, useState } from 'react'
import { Center, Loader, useComputedColorScheme, useMantineTheme } from '@mantine/core'
import type { Config, Data, Layout, PlotlyHTMLElement, PlotRelayoutEvent, PlotSelectionEvent } from 'plotly.js'

type PlotlyModule = typeof import('plotly.js')
let plotlyPromise: Promise<PlotlyModule> | undefined
/** Plotly is ~1.2 MB, so it loads on first use rather than with the app. */
const loadPlotly = () => (plotlyPromise ??= import('plotly.js-basic-dist-min').then((m) => (m as { default?: PlotlyModule }).default ?? m))

export interface PlotlyChartProps {
  data: Data[]
  layout?: Partial<Layout>
  config?: Partial<Config>
  height?: number
  onRelayout?: (event: PlotRelayoutEvent) => void
  onSelected?: (event: PlotSelectionEvent | undefined) => void
  onDoubleClick?: () => void
  /** Index of the hovered point in the first trace, or undefined when the pointer leaves. */
  onHover?: (pointIndex: number | undefined) => void
  /** Accessible description of what the chart shows. */
  ariaLabel: string
}

/** A Plotly chart that follows the Mantine colour scheme and its container's width. */
export function PlotlyChart ({ data, layout, config, height = 420, onRelayout, onSelected, onDoubleClick, onHover, ariaLabel }: PlotlyChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [plotly, setPlotly] = useState<PlotlyModule>()
  const scheme = useComputedColorScheme('light')
  const theme = useMantineTheme()
  const handlers = useRef({ onRelayout, onSelected, onDoubleClick, onHover })
  handlers.current = { onRelayout, onSelected, onDoubleClick, onHover }

  useEffect(() => { loadPlotly().then(setPlotly) }, [])
  const revision = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!plotly || !el) return
    const dark = scheme === 'dark'
    const text = dark ? theme.colors.dark[0] : theme.black
    const grid = dark ? theme.colors.dark[4] : theme.colors.gray[3]
    const axis = { gridcolor: grid, zerolinecolor: grid, linecolor: grid, autorange: true as const }
    plotly.react(el, data, {
      // plotly.js 4.1: react() with the same data arrays and changed shapes resets every axis to
      // its empty-chart range; a new datarevision makes it recompute. Charts keep the user's zoom
      // with layout.uirevision.
      datarevision: ++revision.current,
      height,
      autosize: true,
      // room for tick labels on a right-hand axis
      margin: { t: 30, r: layout?.yaxis2 ? 60 : 20, b: 40, l: 55 },
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      font: { family: theme.fontFamily, color: text, size: 12 },
      // Plotly's hover box is white by default; give it the page's colours so dark mode stays readable
      hoverlabel: {
        bgcolor: dark ? theme.colors.dark[6] : theme.white,
        bordercolor: grid,
        font: { family: theme.fontFamily, color: text }
      },
      legend: { orientation: 'h', x: 0, y: 1.12 },
      ...layout,
      xaxis: { ...axis, ...layout?.xaxis },
      yaxis: { ...axis, ...layout?.yaxis },
      // Plotly expects every yaxisN key to hold an object, so only include the ones in use
      ...(layout?.yaxis2 ? { yaxis2: { ...axis, ...layout.yaxis2 } } : {}),
      ...(layout?.yaxis3 ? { yaxis3: { ...axis, ...layout.yaxis3 } } : {})
    }, { displaylogo: false, responsive: true, modeBarButtonsToRemove: ['lasso2d', 'autoScale2d', 'toImage'], ...config })
  }, [plotly, data, layout, config, height, scheme, theme])

  useEffect(() => {
    const el = ref.current as PlotlyHTMLElement | null
    if (!plotly || !el) return
    el.on('plotly_relayout', (e) => handlers.current.onRelayout?.(e))
    el.on('plotly_selected', (e) => handlers.current.onSelected?.(e))
    el.on('plotly_deselect', () => handlers.current.onSelected?.(undefined))
    el.on('plotly_doubleclick', () => handlers.current.onDoubleClick?.())
    el.on('plotly_hover', (e) => handlers.current.onHover?.(e.points[0]?.pointIndex))
    el.on('plotly_unhover', () => handlers.current.onHover?.(undefined))
    const observer = new ResizeObserver(() => plotly.Plots.resize(el))
    observer.observe(el)
    return () => {
      observer.disconnect()
      plotly.purge(el)
    }
  }, [plotly])

  return (
    <div role='img' aria-label={ariaLabel} style={{ position: 'relative', minHeight: height }}>
      {!plotly && <Center h={height} pos='absolute' inset={0}><Loader /></Center>}
      <div ref={ref} />
    </div>
  )
}
