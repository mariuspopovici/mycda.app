/**
 * `userprefs/{uid}`. Weights are stored in the user's display units, as the legacy app does,
 * so both apps can share the document; convert with totalMassKg() for analysis (ADR-0008).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { doc, getDoc, setDoc, type DocumentData } from 'firebase/firestore'
import { db } from '../firebase'
import { kgToLbs, lbsToKg, type Units } from '../core/units'
import { useUser } from '../auth/AuthContext'

export interface UserPrefs {
  units: Units
  /** Rider weight with kit, in kg (metric) or lbs (imperial). */
  weight: number
  /** Bike weight as tested, in kg or lbs. */
  bikeWeight: number
  cda: number
  crr: number
  /** Drivetrain loss, %. */
  dloss: number
}

/** Suggested starting values for a new profile. */
export const DEFAULT_PREFS: UserPrefs = { units: 'metric', weight: 75, bikeWeight: 8, cda: 0.3, crr: 0.005, dloss: 1 }

const number = (value: unknown, fallback: number) => {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

/** Reads a stored document; the legacy app saved some values as strings. */
export function toUserPrefs (data: DocumentData | undefined): UserPrefs {
  if (!data) return DEFAULT_PREFS
  return {
    units: data.units === 'imperial' ? 'imperial' : 'metric',
    weight: number(data.weight, DEFAULT_PREFS.weight),
    bikeWeight: number(data.bikeWeight, DEFAULT_PREFS.bikeWeight),
    cda: number(data.cda, DEFAULT_PREFS.cda),
    crr: number(data.crr, DEFAULT_PREFS.crr),
    dloss: number(data.dloss, DEFAULT_PREFS.dloss)
  }
}

/** Re-expresses the weights in other units, rounded to 0.1. */
export function convertPrefsUnits (prefs: UserPrefs, units: Units): UserPrefs {
  if (prefs.units === units) return prefs
  const convert = units === 'imperial' ? kgToLbs : lbsToKg
  const round = (n: number) => Math.round(convert(n) * 10) / 10
  return { ...prefs, units, weight: round(prefs.weight), bikeWeight: round(prefs.bikeWeight) }
}

/** Rider + bike mass in kg. */
export function totalMassKg (prefs: UserPrefs): number {
  const total = prefs.weight + prefs.bikeWeight
  return prefs.units === 'imperial' ? lbsToKg(total) : total
}

const queryKey = (uid: string) => ['userprefs', uid]

/** The signed-in user's preferences; `saved` is false until a profile has been stored. */
export function useUserPrefs () {
  const user = useUser()
  const query = useQuery({
    queryKey: queryKey(user.uid),
    queryFn: async () => {
      const snapshot = await getDoc(doc(db, 'userprefs', user.uid))
      return { prefs: toUserPrefs(snapshot.data()), saved: snapshot.exists() }
    },
    staleTime: Infinity
  })
  return { ...query, prefs: query.data?.prefs ?? DEFAULT_PREFS, saved: query.data?.saved ?? false }
}

export function useSaveUserPrefs () {
  const user = useUser()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (prefs: UserPrefs) => setDoc(doc(db, 'userprefs', user.uid), { uid: user.uid, ...prefs }),
    onSuccess: (_result, prefs) => queryClient.setQueryData(queryKey(user.uid), { prefs, saved: true })
  })
}
