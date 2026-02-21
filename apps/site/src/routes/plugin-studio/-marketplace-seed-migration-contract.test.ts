import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const rootRoutePath = resolve(process.cwd(), 'src/routes/__root.tsx');

function getRouteContent() {
  return readFileSync(rootRoutePath, 'utf8');
}

describe('marketplace seed migration startup contract', () => {
  it('runs a one-time marketplace seed migration on app startup', () => {
    const content = getRouteContent();

    expect(content).toContain('migrateMarketplaceSeedReleases');
    expect(content).toContain('MARKETPLACE_SEED_MIGRATION_STORAGE_KEY');
    expect(content).toContain('runMarketplaceSeedMigrationOnce');
    expect(content).toContain('localStorage.getItem');
    expect(content).toContain('localStorage.setItem');
    expect(content).toContain('void runMarketplaceSeedMigrationOnce();');
  });
});
