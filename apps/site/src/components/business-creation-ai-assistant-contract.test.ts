import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation AI assistant contract', () => {
  it('wires step 2 to a staged conversational auth flow with reducer orchestration', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('BusinessOnboardingChat');
    expect(source).toContain('businessOnboardingSessionReducer');
    expect(source).toContain('createInitialBusinessOnboardingSession');
    expect(source).toContain("type: 'select_provider'");
    expect(source).toContain('onboardingStage');
    expect(source).toContain('providerSelectionContext');
    expect(source).toContain('VITE_BUSINESS_ONBOARDING_CHAT_AUTH_V1');
    expect(source).toContain('https://models.dev/api.json');
    expect(source).toContain('getBusinessCreationAssistantTurn');
    expect(source).toContain('mergeSelectedReleaseIds');
    expect(source).not.toContain(
      'CommandInput placeholder="Search providers..."',
    );
  });
});
