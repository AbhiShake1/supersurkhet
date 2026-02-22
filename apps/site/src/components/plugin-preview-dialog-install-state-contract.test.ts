import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const filePath = resolve(process.cwd(), 'src/components/plugin-preview-dialog.tsx');

describe('plugin preview install button state', () => {
  it('shows installed label and disables install action for installed plugins', () => {
    const source = readFileSync(filePath, 'utf8');

    expect(source).toContain('isInstalled: boolean;');
    expect(source).toContain('disabled={isInstalled}');
    expect(source).toContain("{isInstalled ? 'Installed' : 'Install Plugin'}");
  });
});
