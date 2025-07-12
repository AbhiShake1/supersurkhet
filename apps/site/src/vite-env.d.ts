/// <reference types="vite/client" />

interface ImportMetaEnv {
	CLOUDINARY_API_KEY: string;
	CLOUDINARY_API_SECRET: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
