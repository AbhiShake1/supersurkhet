import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation AI assistant contract', () => {
  it('renders ai-first onboarding chat with provider auth controls and inline custom chip', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('getBusinessCreationAssistantTurn');
    expect(source).toContain('AI Business Onboarding');
    expect(source).toContain('selectedAssistantProviderId');
    expect(source).toContain('selectedAssistantModelId');
    expect(source).toContain('selectedAssistantAuthMode');
    expect(source).toContain('customQuickPrompt');
    expect(source).toContain('Save credential');
    expect(source).toContain('Create auth session');
    expect(source).toContain('What kind of business are you creating?');
    expect(source).toContain('Ctrl/Cmd+Enter');
    expect(source).toContain('quickOptions');
    expect(source).toContain('AI-selected setup plan (optional)');
    expect(source).toContain('onKeyDown');
  });
});
