import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const autoformIndexPath = resolve(process.cwd(), 'src/components/ui/autoform/index.ts');
const autoformPath = resolve(process.cwd(), 'src/components/ui/autoform/AutoForm.tsx');
const legacyFieldTypesPath = resolve(
  process.cwd(),
  'src/components/ui/autoform/field-types.ts',
);

describe('autoform field type source-of-truth contract', () => {
  it('does not keep a standalone field-types module', () => {
    expect(existsSync(legacyFieldTypesPath)).toBe(false);
  });

  it('derives FieldTypes directly from field component map keys', () => {
    const content = readFileSync(autoformPath, 'utf8');

    expect(content).toContain(
      'export type FieldTypes = keyof typeof ShadcnAutoFormFieldComponents',
    );
  });

  it('does not re-export legacy field-types module from autoform index', () => {
    const content = readFileSync(autoformIndexPath, 'utf8');

    expect(content).not.toContain("export * from './field-types';");
  });
});
