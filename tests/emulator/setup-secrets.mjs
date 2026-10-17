// The functions emulator reads secrets from functions/.secret.local (gitignored).
// Dummy values are enough: the tests never reach the proxied services.
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const file = resolve(import.meta.dirname, '../../functions/.secret.local')
if (!existsSync(file)) {
  writeFileSync(file, 'OPENWEATHER_API_KEY=emulator\nGOOGLE_MAPS_API_KEY=emulator\n')
}
