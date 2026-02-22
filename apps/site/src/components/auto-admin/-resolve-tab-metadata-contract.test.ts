import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.resolve(import.meta.dirname, 'index.tsx');

describe('auto-admin tab metadata resolver contract', () => {
  it('guards schema group lookup with optional chaining', () => {
    const content = fs.readFileSync(sourcePath, 'utf8');
    expect(content).toContain('group: tab.group ?? schemaMeta?.group,');
  });
});
