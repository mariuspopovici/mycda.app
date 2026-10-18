import { riderHeightFactor, type WindExposure } from '../../core/windModel'

/** How each wind exposure is described to the rider. */
export const EXPOSURE_LABELS: Record<WindExposure, { name: string, description: string }> = {
  open: { name: 'Open', description: 'fields, seafront' },
  mixed: { name: 'Mixed', description: 'hedges, scattered trees' },
  sheltered: { name: 'Sheltered', description: 'suburbs, woods' }
}

/** "mixed exposure, ×0.50" */
export const exposureSummary = (exposure: WindExposure) =>
  `${EXPOSURE_LABELS[exposure].name.toLowerCase()} exposure, ×${riderHeightFactor(exposure).toFixed(2)}`
