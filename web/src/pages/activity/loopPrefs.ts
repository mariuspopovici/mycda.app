import type { LoopPrecision } from '../../core/loopFinder'

export interface LoopPrefs {
  precision: LoopPrecision
  /** Points (seconds at 1 s recording). */
  minDuration: number
  maxDuration: number
}

export const DEFAULT_LOOP_PREFS: LoopPrefs = { precision: 'low', minDuration: 60, maxDuration: 1000 }
