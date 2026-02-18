import { describe, expect, it } from 'vitest';
import {
  getRecommendedSeedReleaseIds,
  MARKETPLACE_SEED_RELEASES,
  mergeMarketplaceReleasesWithSeed,
  parseReleaseId,
  toMarketplaceSeedReleaseDocs,
} from './marketplace-seed';

describe('marketplace seed catalog', () => {
  it('ships multiple installable starter releases', () => {
    expect(MARKETPLACE_SEED_RELEASES.length).toBeGreaterThanOrEqual(5);

    const ids = MARKETPLACE_SEED_RELEASES.map(
      (release) => `${release.pluginId}@${release.version}`,
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('parses deterministic release id format', () => {
    expect(parseReleaseId('acme.plugin@1.2.3')).toEqual({
      pluginId: 'acme.plugin',
      version: '1.2.3',
    });

    expect(parseReleaseId('broken-release-id')).toBeNull();
    expect(parseReleaseId('@1.0.0')).toBeNull();
  });

  it('returns non-empty recommended starter stack per business type', () => {
    expect(
      getRecommendedSeedReleaseIds('retail').length,
    ).toBeGreaterThanOrEqual(2);
    expect(getRecommendedSeedReleaseIds('food').length).toBeGreaterThanOrEqual(
      2,
    );
    expect(getRecommendedSeedReleaseIds('other').length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it('converts static seed metadata into installable release docs', () => {
    const releaseDocs = toMarketplaceSeedReleaseDocs();

    expect(releaseDocs.length).toBe(MARKETPLACE_SEED_RELEASES.length);
    expect(releaseDocs[0]).toMatchObject({
      id: `${MARKETPLACE_SEED_RELEASES[0]?.pluginId}@${MARKETPLACE_SEED_RELEASES[0]?.version}`,
      visibility: 'public',
    });
  });

  it('merges live releases with static seeds without overriding live records', () => {
    const liveOnlyDoc = {
      id: 'custom.plugin@9.9.9',
      pluginId: 'custom.plugin',
      version: '9.9.9',
      manifestHash: 'live-manifest',
      artifactHash: 'live-artifact',
      author: { userId: 'live-user' },
      visibility: 'public' as const,
      docs: { title: 'Live Plugin', description: 'Live only' },
      actionManifest: [],
      publishedAt: '2025-01-01T00:00:00.000Z',
    };

    const sameSeedIdAsLive = {
      id: 'supersurkhet.plugin.finance-ops@1.0.0',
      pluginId: 'supersurkhet.plugin.finance-ops',
      version: '1.0.0',
      manifestHash: 'live-finance-manifest',
      artifactHash: 'live-finance-artifact',
      author: { userId: 'live-user' },
      visibility: 'public' as const,
      docs: { title: 'Finance Ops (Live)', description: 'Live row should win' },
      actionManifest: [],
      publishedAt: '2026-01-01T00:00:00.000Z',
    };

    const merged = mergeMarketplaceReleasesWithSeed([
      liveOnlyDoc,
      sameSeedIdAsLive,
    ]);

    expect(
      merged.find((release) => release.id === liveOnlyDoc.id)?.docs?.title,
    ).toBe('Live Plugin');
    expect(
      merged.find((release) => release.id === sameSeedIdAsLive.id)?.docs?.title,
    ).toBe('Finance Ops (Live)');
    expect(merged.length).toBeGreaterThan(MARKETPLACE_SEED_RELEASES.length);
  });
});
