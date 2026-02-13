import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function readSource(pathFromSrc: string) {
  return readFileSync(resolve(process.cwd(), `src/${pathFromSrc}`), 'utf8');
}

describe('autoform HMR contracts', () => {
  it('keeps AutoForm free of compiler memo directive', () => {
    const content = readSource('components/ui/autoform/AutoForm.tsx');

    expect(content).not.toMatch(
      /export function AutoForm[\s\S]*?'use memo';/,
    );
  });

  it('keeps SelectField controlled by external form value', () => {
    const content = readSource('components/ui/autoform/components/SelectField.tsx');

    expect(content).not.toContain('useState(');
    expect(content).toContain('const currentValue = String(value ?? field.default ?? \'\')');
    expect(content).toContain('value={currentValue}');
  });
});
