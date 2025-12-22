/// <reference types="vite/client" />

interface ImportMetaEnv {
  CLOUDINARY_API_KEY: string;
  CLOUDINARY_API_SECRET: string;
  VITE_GOOGLE_OAUTH_CLIENT_ID: string;
  VITE_RESEND_API_KEY: string;
  GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
