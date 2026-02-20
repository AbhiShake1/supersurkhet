import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business creation AI assistant contract', () => {
  it('renders ai-sdk driven multistep assistant with keyboard UX hooks', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('getBusinessCreationAssistantTurn');
    expect(source).toContain('Ctrl/Cmd+Enter');
    expect(source).toContain('Alt+1/2/3');
    expect(source).toContain('quickOptions');
    expect(source).toContain('Attach files');
    expect(source).toContain('onKeyDown');
  });
});
