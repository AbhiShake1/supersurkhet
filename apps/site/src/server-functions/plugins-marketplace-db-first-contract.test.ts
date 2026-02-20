import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginsServerPath = resolve(process.cwd(), 'src/server-functions/plugins.ts');

function getServerContent() {
  return readFileSync(pluginsServerPath, 'utf8');
}

function getSection(
  content: string,
  startMarker: string,
  endMarker: string,
) {
  const start = content.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const end = content.indexOf(endMarker, start);
  expect(end).toBeGreaterThan(start);
  return content.slice(start, end);
}

describe('plugins marketplace DB-first contract', () => {
  it('installs and rollbacks from existing pluginRelease rows without implicit seed hydration', () => {
    const content = getServerContent();
    const installSection = getSection(
      content,
      'export async function installPluginRelease',
      '// export const installPluginRelease',
    );
    const rollbackSection = getSection(
      content,
      'export async function rollbackPluginRelease',
      '// export const rollbackPluginRelease',
    );

    expect(installSection).toContain(
      'const store = await loadPublishedStore(parsedInput.businessId);',
    );
    expect(rollbackSection).toContain(
      'const store = await loadPublishedStore(parsedInput.businessId);',
    );
    expect(installSection).not.toContain('ensureMarketplaceSeedReleases');
    expect(rollbackSection).not.toContain('ensureMarketplaceSeedReleases');
    expect(installSection).not.toContain('after ensuring marketplace seeds');
    expect(rollbackSection).not.toContain('after ensuring marketplace seeds');
  });

  it('bootstraps defaults from already published releases without runtime seed writes', () => {
    const content = getServerContent();
    const bootstrapSection = getSection(
      content,
      'export async function bootstrapDefaultPluginsForBusiness',
      '// export const bootstrapDefaultPluginsForBusiness',
    );

    expect(bootstrapSection).toContain(
      'const store = await loadPublishedStore(data.businessId);',
    );
    expect(bootstrapSection).not.toContain('ensureMarketplaceSeedReleases');
  });

  it('keeps an explicit migration entrypoint to seed marketplace releases once', () => {
    const content = getServerContent();
    const migrationSection = getSection(
      content,
      'export async function migrateMarketplaceSeedReleases',
      'export async function bootstrapDefaultPluginsForBusiness',
    );

    expect(migrationSection).toContain('ensureMarketplaceSeedReleases');
    expect(migrationSection).toContain('migrationId');
  });
});
