import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation plugin selection label contract', () => {
  it('keeps step 2 focused on ai auth and moves plugin browsing to step 3', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('BusinessOnboardingAssistantForm form={form}');
    expect(source).toContain('Configure provider authentication here.');
    expect(source).toContain('workflow setup happen in Step 3');
    expect(source).toContain('Chapter 3 · Plugin Browser');
    expect(source).toContain('pre-selected from Step 2');
    expect(source).toContain('Browse and choose plugins before launch');
    expect(source).not.toContain('Chapter 2 · AI Integration & Authentication');
    expect(source).not.toContain('Connect your model provider, authenticate once');
    expect(source).not.toContain('Plugin stack (required)');
    expect(source).not.toContain('Add to queue');
    expect(source).not.toContain('Remove from queue');
  });
});
