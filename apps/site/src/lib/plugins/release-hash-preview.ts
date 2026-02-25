import type {
  ActionManifestDoc,
  AdminTabDoc,
  SchemaDoc,
} from './types';

type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type ReleaseHashPreviewInput = {
  pluginId: string;
  version: string;
  docs?: {
    title?: string;
    description?: string;
  };
  actionManifest: ActionManifestDoc[];
  schemaDocs?: SchemaDoc[];
  adminTabs?: AdminTabDoc[];
};

export type ReleaseHashPreview = {
  manifestHash: string;
  artifactHash: string;
};

function normalizeJson(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJson(entry));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .map(([key, entry]) => [key, normalizeJson(entry)] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    return Object.fromEntries(entries);
  }
  throw new Error('Non-serializable value detected while canonicalizing JSON');
}

function canonicalizeJson(value: unknown) {
  return JSON.stringify(normalizeJson(value));
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (subtle && typeof TextEncoder !== 'undefined') {
    const encoded = new TextEncoder().encode(input);
    const digest = await subtle.digest('SHA-256', encoded);
    return bytesToHex(new Uint8Array(digest));
  }

  const cryptoModule = await import('node:crypto');
  if (typeof cryptoModule.createHash !== 'function') {
    throw new Error('SHA-256 hashing is unavailable in this runtime');
  }
  return cryptoModule.createHash('sha256').update(input).digest('hex');
}

export async function previewReleaseHashes(
  input: ReleaseHashPreviewInput,
): Promise<ReleaseHashPreview> {
  const manifestPayload = {
    pluginId: input.pluginId,
    version: input.version,
    docs: input.docs,
    actionManifest: input.actionManifest ?? [],
    schemaDocs: input.schemaDocs ?? [],
    adminTabs: input.adminTabs ?? [],
  };
  const artifactPayload = {
    schemaDocs: input.schemaDocs ?? [],
    adminTabs: input.adminTabs ?? [],
  };

  const [manifestHash, artifactHash] = await Promise.all([
    sha256Hex(canonicalizeJson(manifestPayload)),
    sha256Hex(canonicalizeJson(artifactPayload)),
  ]);

  return {
    manifestHash,
    artifactHash,
  };
}
