export interface CdaSummary {
  mean: number
  standardDeviation: number
  /** Coefficient of variation in percent. */
  coefficientOfVariation: number
}

/** Mean, population standard deviation and CV of segment CdA values. */
export function summarizeCdA (values: number[]): CdaSummary | undefined {
  if (values.length === 0) return undefined
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  const standardDeviation = Math.sqrt(variance)
  return { mean, standardDeviation, coefficientOfVariation: (standardDeviation / mean) * 100 }
}

export interface BaselineComparison {
  /** Baseline CdA minus segment CdA; positive means the segment is faster. */
  cdaDelta: number
  /** Delta as a percent of the mean of the two values. */
  cdaDeltaPct: number
  /** Rule of thumb: 0.005 m² of CdA ≈ 5 W. */
  wattsSaved: number
  /** Rule of thumb: 0.005 m² of CdA ≈ 20 s over 40 km. */
  seconds40k: number
}

export function compareToBaseline (baselineCdA: number, cda: number): BaselineComparison {
  const cdaDelta = baselineCdA - cda
  const steps = cdaDelta / 0.005
  return {
    cdaDelta,
    cdaDeltaPct: (cdaDelta / ((baselineCdA + cda) / 2)) * 100,
    wattsSaved: steps * 5,
    seconds40k: Math.floor(steps * 0.5 * 40)
  }
}
