import { describe, expect, it } from 'vitest';
import { appSchema, transformSchema } from '@/lib/schema';
import { db } from '@/lib/ssr/api';

describe('plugin v2 api scaffolding contracts', () => {
  it('exposes new plugin v2 tables in transformed schema used by client api', () => {
    const transformed = transformSchema(appSchema);
    expect(transformed.shape).toHaveProperty('pluginV2Diagnostics');
    expect(transformed.shape).toHaveProperty('pluginPublishReview');
    expect(transformed.shape).toHaveProperty('pluginUserReview');
    expect(transformed.shape).toHaveProperty('pluginActionCapabilityEnvelope');
    expect(transformed.shape).toHaveProperty('pluginRoutesTabsConfig');
  });

  it('exposes new plugin v2 tables in ssr db adapter', () => {
    expect(db).toHaveProperty('pluginV2Diagnostics');
    expect(db).toHaveProperty('pluginPublishReview');
    expect(db).toHaveProperty('pluginUserReview');
    expect(db).toHaveProperty('pluginActionCapabilityEnvelope');
    expect(db).toHaveProperty('pluginRoutesTabsConfig');
  });
});
