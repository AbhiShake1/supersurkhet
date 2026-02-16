import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pluginStudioRoutePath = resolve(process.cwd(), 'src/routes/plugin-studio.tsx');

function getRouteContent() {
  return readFileSync(pluginStudioRoutePath, 'utf8');
}

describe('plugin-studio client boundary', () => {
  it('does not import server-only plugin-service module into client route', () => {
    const content = getRouteContent();

    expect(content).not.toContain(`from '@/lib/plugins/plugin-service'`);
  });

  it('uses a server function for release hash previews', () => {
    const content = getRouteContent();

    expect(content).toContain('previewPluginReleaseHashes');
    expect(content).toContain(`from '@/server-functions/plugins'`);
  });

  it('uses TanStack Query hooks for async server state', () => {
    const content = getRouteContent();

    expect(content).toContain(`from '@tanstack/react-query'`);
    expect(content).toContain('useMutation({');
    expect(content).toContain('useQuery({');
  });

  it('uses skeleton UI instead of blocking spinner gate', () => {
    const content = getRouteContent();

    expect(content).toContain('PluginStudioSkeleton');
    expect(content).toContain('<Skeleton');
    expect(content).not.toContain('if (seeding)');
    expect(content).not.toContain('setSeeding(');
    expect(content).not.toContain('Loader2');
  });

  it('centers the page content with an explicit max-width container', () => {
    const content = getRouteContent();

    expect(content).toContain('mx-auto w-full max-w-7xl');
  });

  it('supports both guided and advanced plugin creation flows', () => {
    const content = getRouteContent();

    expect(content).toContain('Guided Builder');
    expect(content).toContain('Advanced JSON');
    expect(content).toContain('builderMode');
  });

  it('applies template presets through a dedicated template handler', () => {
    const content = getRouteContent();

    expect(content).toContain('applyTemplatePreset');
    expect(content).toContain('Loaded template');
  });
});
