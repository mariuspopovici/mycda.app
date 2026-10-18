// Generates web/.env.local from the legacy app's config/prod.env.js (both gitignored).
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const legacy = resolve(import.meta.dirname, '../../config/prod.env.js')
const target = resolve(import.meta.dirname, '../.env.local')
if (existsSync(target)) {
  console.log('.env.local already exists; not overwriting.')
  process.exit(0)
}

const source = readFileSync(legacy, 'utf8')
const value = (key) => {
  const match = new RegExp(`${key}:\\s*\`"([^"]*)"\``).exec(source)
  if (!match) throw new Error(`${key} not found in config/prod.env.js`)
  return match[1]
}

writeFileSync(target, [
  `VITE_FIREBASE_API_KEY=${value('FB_API_KEY')}`,
  `VITE_FIREBASE_AUTH_DOMAIN=${value('FB_AUTH_DOMAIN')}`,
  `VITE_FIREBASE_PROJECT_ID=${value('FB_PROJECT_ID')}`,
  `VITE_FIREBASE_STORAGE_BUCKET=${value('FB_STORAGE_BUCKET')}`,
  `VITE_FIREBASE_MESSAGING_SENDER_ID=${value('FB_MSG_SENDER_ID')}`,
  'VITE_API_URL=https://us-central1-mycda-c43c6.cloudfunctions.net/api',
  'VITE_USE_EMULATORS=false',
  ''
].join('\n'))
console.log('Wrote .env.local')
