import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginsServerPath = resolve(process.cwd(), 'src/server-functions/plugins.ts');

function getServerContent() {
  return readFileSync(pluginsServerPath, 'utf8');
}

describe('plugins draft server contract', () => {
  it('uses one canonical draft id per user instead of per plugin', () => {
    const content = getServerContent();

    expect(content).toContain(
      'const stableDraftId = `draft.${toStableDraftIdSuffix(canonicalActorUserId)}`;',
    );
    expect(content).not.toContain(
      'const stableDraftId = `draft.${toStableDraftIdSuffix(data.pluginId)}.${toStableDraftIdSuffix(canonicalActorUserId)}`;',
    );
    expect(content).not.toContain('draft.pluginId === data.pluginId');
  });
});
