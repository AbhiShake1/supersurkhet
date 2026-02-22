import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(
  process.cwd(),
  'src/components/business-creation-form.tsx',
);

describe('business onboarding oauth connect contract', () => {
  it('opens oauth in a new tab and includes popup-blocked fallback messaging', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('window.open(');
    expect(source).toContain("'_blank'");
    expect(source).toContain("'noopener,noreferrer'");
    expect(source).toContain(
      'Popup/new-tab blocked. Use the fallback secure OAuth link in chat.',
    );
    expect(source).toContain('/v1/auth/providers/oauth/authorize');
    expect(source).toContain('/v1/auth/providers/oauth/callback');
  });
});
