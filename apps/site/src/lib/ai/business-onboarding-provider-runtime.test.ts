import { describe, expect, it } from 'vitest';
import {
  createAssistantLanguageModel,
  normalizeAssistantProviderConfig,
} from './business-onboarding-provider-runtime';

describe('business onboarding provider runtime', () => {
  it('normalizes provider from selected model when explicit provider is omitted', () => {
    const provider = normalizeAssistantProviderConfig({
      model: 'gpt-5-mini',
      apiKey: 'sk-test',
    });

    expect(provider.providerId).toBe('openai');
    expect(provider.authMode).toBe('api-key');
    expect(provider.model).toBe('gpt-5-mini');
  });

  it('requires credentials for openai unless provided via env', () => {
    const provider = normalizeAssistantProviderConfig({
      providerId: 'openai',
      model: 'gpt-5-mini',
      authMode: 'api-key',
    });

    expect(createAssistantLanguageModel(provider)).toBeNull();
  });

  it('supports local ollama without credentials', () => {
    const provider = normalizeAssistantProviderConfig({
      providerId: 'ollama',
      model: 'qwen3-coder:30b',
      authMode: 'none',
    });

    expect(createAssistantLanguageModel(provider)).toBeTruthy();
  });
});
