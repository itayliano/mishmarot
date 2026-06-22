/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Google OAuth Client ID for one-click "add all to calendar". */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
