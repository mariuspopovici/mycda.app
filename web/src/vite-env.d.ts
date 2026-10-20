/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID?: string
  readonly VITE_API_URL: string
  readonly VITE_USE_EMULATORS?: string
  /** reCAPTCHA Enterprise site key for App Check; the run explainer is offered only when it's set */
  readonly VITE_RECAPTCHA_ENTERPRISE_SITE_KEY?: string
  /** App Check debug token for local development, registered in the Firebase console */
  readonly VITE_APPCHECK_DEBUG_TOKEN?: string
  /** Gemini model for the run explainer (default gemini-3.5-flash) */
  readonly VITE_GEMINI_MODEL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/** web/package.json version, injected by Vite. */
declare const __APP_VERSION__: string
