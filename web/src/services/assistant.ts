/**
 * The run explainer: Google Gemini through Firebase AI Logic (Gemini Developer API), behind App
 * Check. Only numbers computed by core/runDiagnostics are sent, never GPS tracks, names or notes, and
 * the model never computes CdA: it explains the numbers it is given.
 *
 * Firebase AI Logic and App Check (with its reCAPTCHA script) load on first use, so pages that never
 * ask for an explanation don't download them.
 */
import type { RunDiagnostics } from '../core/runDiagnostics'
import { kgToLbs, kmToMi, mToFt, type Units } from '../core/units'
import { app, useEmulators } from '../firebase'

const env = import.meta.env
const SITE_KEY: string | undefined = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
export const ASSISTANT_MODEL: string = env.VITE_GEMINI_MODEL || 'gemini-3.5-flash'

/** The explainer needs App Check in production; the emulator build calls a mocked endpoint in tests. */
export const assistantAvailable = useEmulators || !!SITE_KEY

export type Verdict = 'good' | 'check' | 'unreliable'

export interface RunExplanation {
  verdict: Verdict
  /** One sentence. */
  headline: string
  findings: Array<{ title: string, detail: string }>
  nextSteps: string[]
}

/** What the analysis looks like now, alongside its diagnostics. Metric. */
export interface ExplainRunContext {
  diagnostics: RunDiagnostics
  parameters: { mass: number, rho: number, crr: number, cda: number, dloss: number }
  airspeedSource: 'measured' | 'ground' | 'wind' | 'manual'
  /** e.g. "closure of the run (it ends where it started)" */
  fitBasis: string
  units: Units
}

const AIRSPEED: Record<ExplainRunContext['airspeedSource'], string> = {
  measured: 'measured by an air speed sensor',
  ground: 'still air (air speed = ground speed)',
  wind: 'hourly weather wind from Open-Meteo, scaled to rider height',
  manual: 'a constant wind entered by the rider'
}

const signed = (n: number, digits: number) => `${n >= 0 ? '+' : ''}${n.toFixed(digits)}`

/** The facts sent to the model, in the rider's units. Pure, so it can be tested and reviewed. */
export function explainRunPrompt ({ diagnostics: d, parameters: p, airspeedSource, fitBasis, units }: ExplainRunContext): string {
  const metric = units === 'metric'
  const h = (m: number) => (metric ? `${m.toFixed(2)} m` : `${mToFt(m).toFixed(2)} ft`)
  const km = (k: number) => (metric ? `${k.toFixed(2)} km` : `${kmToMi(k).toFixed(2)} mi`)
  const kmh = (v: number) => (metric ? `${v.toFixed(1)} km/h` : `${kmToMi(v).toFixed(1)} mph`)
  const kg = (m: number) => (metric ? `${m.toFixed(1)} kg` : `${kgToLbs(m).toFixed(1)} lbs`)
  const s = d.sensitivity
  const lines = [
    `Units: ${metric ? 'metric' : 'imperial'}. CdA is always in m².`,
    `Run: ${Math.round(d.duration)} s, ${km(d.distance)}, ${d.partsKind === 'legs' ? `${d.parts.length} legs joined (an out and back test; virtual elevation holds level at each join)` : 'one continuous range, described in thirds'}.`,
    `Parameters now: CdA ${p.cda.toFixed(3)}, Crr ${p.crr.toFixed(4)}, total mass ${kg(p.mass)}, air density ${p.rho.toFixed(3)} kg/m³, drivetrain loss ${p.dloss.toFixed(1)} %.`,
    `Air speed source: ${AIRSPEED[airspeedSource]}.`,
    `Suggested CdA from ${fitBasis}: ${d.fittedCda.toFixed(3)}${d.fittedAtBound ? ' (AT THE EDGE of the search range 0.05–0.80: no plausible CdA explains the run)' : ''}.`,
    `At the current parameters: run closure error ${signed(d.closureError, 2)} m (virtual elevation change minus recorded elevation change over the run; 0 means it closes; positive means virtual elevation ends too high), RMS difference from the recorded elevation ${h(d.elevationRms)}.`,
    '',
    `${d.partsKind === 'legs' ? 'Legs' : 'Thirds'}:`,
    ...d.parts.map((part, i) => `- ${d.partsKind === 'legs' ? 'Leg' : 'Third'} ${i + 1}: ${Math.round(part.seconds)} s, ${km(part.distance)}, ground speed ${kmh(part.averageSpeed)}, air speed ${kmh(part.averageAirspeed)}, power ${Math.round(part.averagePower)} W, recorded elevation change ${signed(metric ? part.elevationChange : mToFt(part.elevationChange), 2)} ${metric ? 'm' : 'ft'}, virtual elevation change ${signed(metric ? part.virtualElevationChange : mToFt(part.virtualElevationChange), 2)} ${metric ? 'm' : 'ft'}.`),
    '',
    'How far the suggested CdA moves (m²) when one input changes by a typical error:',
    `- mass +1 kg: ${signed(s.massPlus1kg, 4)}`,
    `- power +1 %: ${signed(s.powerPlus1Percent, 4)}`,
    `- Crr +0.0005: ${signed(s.crrPlus00005, 4)}`,
    `- air density +0.01 kg/m³: ${signed(s.rhoPlus001, 4)}`,
    `- air speed +2 km/h throughout: ${signed(s.airspeedPlus2kmh, 4)}`,
    '',
    `Data quality: ${d.dataQuality.gaps} gaps over 10 s; zero power on ${d.dataQuality.zeroPowerWhileMoving.toFixed(1)} % of moving samples; max power ${Math.round(d.dataQuality.maxPower)} W; ground speed ${kmh(d.dataQuality.minSpeed)} to ${kmh(d.dataQuality.maxSpeed)}.`
  ]
  return lines.join('\n')
}

export const SYSTEM_INSTRUCTION = `You explain cycling aerodynamics field tests analysed with Robert Chung's virtual elevation (VE) method on MyCdA.app.
The rider sees a chart of virtual elevation against recorded elevation, and parameters (CdA, Crr, mass, air density, drivetrain loss, air speed source).

How to read the numbers:
- VE is the elevation the power, speed and parameters imply. With the right parameters it follows the road, and an out and back or a loop ends at the height it started (closure error near 0).
- VE that ends too high (positive closure error, VE rising) means too little drag was modelled: CdA or Crr too low, or power too high, mass too low, air density too low, or air speed too low. VE ending too low means the opposite.
- On an out and back, VE rising on one leg and falling on the other, by similar amounts, is the signature of wind that the air speed source doesn't capture; VE moving the same way on both legs points to the parameters.
- On a single range, a steady drift across all thirds points to the parameters; a change in only one third points to an event there (braking, a gust, a power dropout).
- The sensitivity numbers show which input matters most. Compare each with how well the rider likely knows that input (mass to about 1 kg, power to 1–2 %, Crr to about 0.0005, air density to about 0.01 kg/m³ unless measured, wind to a few km/h) and name the one to measure better.
- If the current CdA differs from the suggested CdA by more than 0.005, say so.
- A suggested CdA at the edge of the search range means the inputs are wrong, not the rider.
- Gaps over 10 s are skipped in the integration. Zero power on more than 5 % of moving samples suggests coasting or power dropouts, which distort the result.
- One closed run can't separate Crr from CdA; a wrong Crr shifts CdA.

Rules:
- Use only the numbers given. Never compute, estimate or invent a CdA or any other number; quote the numbers given, in the units given.
- Be specific and brief: plain words, short sentences, no markdown, no greetings.
- verdict: "good" when the run closes (|closure error| under about 0.3 m on an out and back) with the current CdA close to the suggestion and no data problems; "unreliable" when the fit is at the edge of the range or the data has serious problems; otherwise "check".
- headline: one sentence with the main point.
- findings: 2 to 4 items, each a short title and one or two sentences.
- nextSteps: 1 to 3 concrete actions in the app or on the next test.`

let modelPromise: Promise<import('firebase/ai').GenerativeModel> | undefined

async function getModel () {
  modelPromise ??= (async () => {
    if (!useEmulators && SITE_KEY) {
      const { initializeAppCheck, ReCaptchaEnterpriseProvider } = await import('firebase/app-check')
      // local development registers a debug token instead (Firebase console → App Check → Manage debug tokens)
      if (env.DEV) (self as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean }).FIREBASE_APPCHECK_DEBUG_TOKEN = env.VITE_APPCHECK_DEBUG_TOKEN || true
      initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(SITE_KEY), isTokenAutoRefreshEnabled: true })
    }
    const { getAI, getGenerativeModel, GoogleAIBackend, Schema } = await import('firebase/ai')
    const ai = getAI(app, { backend: new GoogleAIBackend() })
    return getGenerativeModel(ai, {
      model: ASSISTANT_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
        responseSchema: Schema.object({
          properties: {
            verdict: Schema.enumString({ enum: ['good', 'check', 'unreliable'] }),
            headline: Schema.string(),
            findings: Schema.array({ items: Schema.object({ properties: { title: Schema.string(), detail: Schema.string() } }) }),
            nextSteps: Schema.array({ items: Schema.string() })
          }
        })
      }
    })
  })()
  return modelPromise
}

/** Checks the model's JSON against RunExplanation; anything malformed is an error, never shown half-parsed. */
export function parseExplanation (text: string): RunExplanation {
  const value = JSON.parse(text) as Partial<RunExplanation>
  const ok = value && ['good', 'check', 'unreliable'].includes(value.verdict as string) && typeof value.headline === 'string' &&
    Array.isArray(value.findings) && value.findings.every((f) => typeof f?.title === 'string' && typeof f?.detail === 'string') &&
    Array.isArray(value.nextSteps) && value.nextSteps.every((s) => typeof s === 'string')
  if (!ok) throw new Error('The assistant returned an answer in an unexpected shape.')
  return value as RunExplanation
}

export async function explainRun (context: ExplainRunContext): Promise<RunExplanation> {
  const model = await getModel()
  const result = await model.generateContent(explainRunPrompt(context))
  return parseExplanation(result.response.text())
}
