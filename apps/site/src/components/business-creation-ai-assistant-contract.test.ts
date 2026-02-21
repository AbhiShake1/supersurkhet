import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation AI assistant contract', () => {
  it('renders ai auth onboarding in step 2 without inline plugin browser controls', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('AI Integration');
    expect(source).toContain('selectedAssistantProviderId');
    expect(source).toContain('selectedAssistantModelId');
    expect(source).toContain('selectedAssistantAuthMode');
    expect(source).toContain('Save credential');
    expect(source).toContain('Create auth session');
    expect(source).toContain('Search providers...');
    expect(source).toContain('https://models.dev/logos/');
    expect(source).toContain('https://models.dev/api.json');
    expect(source).toContain('workflow setup happen in Step 3');
    expect(source).not.toContain('getBusinessCreationAssistantTurn');
    expect(source).not.toContain('AI Business Onboarding');
    expect(source).not.toContain('customQuickPrompt');
    expect(source).not.toContain('Describe your business and what it does.');
  });
});
