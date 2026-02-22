import { describe, expect, it } from 'vitest';
import { businessSchema } from './schema';

describe('business schema contract', () => {
  it('accepts business creation payloads without businessType', () => {
    const parsed = businessSchema.parse({
      name: 'Acme Mart',
      id: 'acme-mart',
    });

    expect(parsed.name).toBe('Acme Mart');
    expect(parsed.id).toBe('acme-mart');
    expect('businessType' in parsed).toBe(false);
  });
});
