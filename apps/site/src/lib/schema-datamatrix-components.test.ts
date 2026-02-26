import { describe, expect, it } from 'vitest';
import { appSchema } from '@/lib/schema';

describe('dataMatrixAction admin components', () => {
  it('registers flow builder component', () => {
    const components = appSchema.dataMatrixAction.components?.() ?? [];

    expect(components).toHaveLength(1);
    expect(components[0]).toMatchObject({
      name: 'Flow Builder',
    });
  });
});
