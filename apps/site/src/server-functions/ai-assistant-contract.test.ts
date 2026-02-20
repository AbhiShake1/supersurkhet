import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(process.cwd(), 'src/server-functions/ai.ts');

describe('assistant server-function contract', () => {
  it('uses session/store-aware multi-provider resolution with structured JSON responses', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('generateObject');
    expect(source).toContain('assistantProviderConfigSchema');
    expect(source).toContain('createAssistantLanguageModel');
    expect(source).toContain('resolveAssistantModelOption');
    expect(source).toContain('authSessionToken');
    expect(source).toContain('AI_PROVIDER_STORE_COOKIE_NAME');
    expect(source).toContain('decryptProviderCredentialStore');
    expect(source).toContain('assistantResponseSchema');
    expect(source).toContain('buildAssistantFallbackResponse');
  });
});
