import { describe, expect, it } from 'vitest';
import {
  BUSINESS_ONBOARDING_MODEL_OPTIONS,
  DEFAULT_BUSINESS_ONBOARDING_MODEL_ID,
  resolveAssistantModelOption,
} from './business-onboarding-models';

describe('business onboarding model options', () => {
  it('defaults to a google model so onboarding can run with google env key', () => {
    const model = resolveAssistantModelOption();

    expect(model.provider).toBe('google');
    expect(model.id).toBe(DEFAULT_BUSINESS_ONBOARDING_MODEL_ID);
  });

  it('includes grouped model options across supported providers', () => {
    const providers = new Set(
      BUSINESS_ONBOARDING_MODEL_OPTIONS.map((option) => option.provider),
    );

    expect(providers.has('google')).toBe(true);
    expect(providers.has('openai')).toBe(true);
    expect(providers.has('anthropic')).toBe(true);
    expect(BUSINESS_ONBOARDING_MODEL_OPTIONS.length).toBeGreaterThan(8);
  });
});
