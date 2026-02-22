import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginsServerPath = resolve(
  process.cwd(),
  'src/server-functions/plugins.ts',
);

function getServerContent() {
  return readFileSync(pluginsServerPath, 'utf8');
}

function getSection(content: string, startMarker: string, endMarker: string) {
  const start = content.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = content.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end);
}

describe('plugins marketplace DB-first contract', () => {
  it('installs from existing pluginRelease rows without implicit seed hydration', () => {
    const content = getServerContent();
    const installSection = getSection(
      content,
      'export async function installPluginRelease',
      'export async function createPluginDraft',
    );

    expect(installSection).toContain(
      'const store = await loadPublishedStore(parsedInput.businessId);',
    );
    expect(installSection).not.toContain('ensureMarketplaceSeedReleases');
    expect(installSection).not.toContain('after ensuring marketplace seeds');
  });

  it('keeps an explicit migration entrypoint to seed marketplace releases once', () => {
    const content = getServerContent();
    const migrationSection = getSection(
      content,
      'export async function migrateMarketplaceSeedReleases',
      'const releaseUninstallInputSchema',
    );

    expect(migrationSection).toContain('ensureMarketplaceSeedReleases');
    expect(migrationSection).toContain('migrationId');
  });

  it('removes unused publish/preview/rollback/bootstrap entrypoints from runtime exports', () => {
    const content = getServerContent();

    expect(content).not.toContain('export async function publishPluginRelease');
    expect(content).not.toContain('export const previewPluginReleaseHashes');
    expect(content).not.toContain(
      'export async function rollbackPluginRelease',
    );
    expect(content).not.toContain(
      'export async function bootstrapDefaultPluginsForBusiness',
    );
  });
});
