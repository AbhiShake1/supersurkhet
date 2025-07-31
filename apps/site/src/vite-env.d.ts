/// <reference types="vite/client" />

interface ImportMetaEnv {
	CLOUDINARY_API_KEY: string;
	CLOUDINARY_API_SECRET: string;
	VITE_GOOGLE_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
