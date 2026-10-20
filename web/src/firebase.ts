import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { connectStorageEmulator, getStorage } from 'firebase/storage'

const env = import.meta.env

/** True when running against the local emulators (project demo-mycda), never production data. */
export const useEmulators = env.VITE_USE_EMULATORS === 'true'

const projectId = useEmulators ? 'demo-mycda' : env.VITE_FIREBASE_PROJECT_ID

export const app = initializeApp({
  apiKey: useEmulators ? 'demo-key' : env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId,
  storageBucket: useEmulators ? `${projectId}.appspot.com` : env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  // the registered web app; Firebase AI Logic and App Check need it
  appId: useEmulators ? '1:000000000000:web:0000000000000000' : env.VITE_FIREBASE_APP_ID
})

export const auth = getAuth(app)
// optional fields (e.g. a lap without average power) are left out rather than rejected
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
export const storage = getStorage(app)

/** Base URL of the `api` Cloud Function. */
export const apiUrl = useEmulators
  ? `http://127.0.0.1:5001/${projectId}/us-central1/api`
  : env.VITE_API_URL

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectStorageEmulator(storage, '127.0.0.1', 9199)
}
