import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(process.cwd(), 'src/server-functions/ai.ts');

describe('assistant server-function contract', () => {
  it('uses Vercel AI SDK structured responses with fallback', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('generateObject');
    expect(source).toContain('createOpenAI');
    expect(source).toContain('assistantResponseSchema');
    expect(source).toContain('buildAssistantFallbackResponse');
  });
});
