import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import '@/lib/zod/with-references';
import { parseSchema } from '@/components/ui/autoform/zod';
import {
  getSchemaReferenceConfig,
  getSchemaReferenceSources,
} from './with-references';

describe('withReferences', () => {
  it('stores and resolves string references metadata', () => {
    const schema = z
      .string()
      .references('party', { displayKey: 'name' })
      .optional();
    const reference = getSchemaReferenceConfig(schema);

    expect(reference?.table).toBe('party');
    expect(reference?.displayKey).toBe('name');
  });

  it('supports displayField as an alias for displayKey', () => {
    const schema = z.string().references('party', {
      displayField: 'name',
      fallbacks: [{ table: 'customer', displayField: 'name' }],
    });
    const reference = getSchemaReferenceConfig(schema);
    const sources = getSchemaReferenceSources(reference);

    expect(reference?.table).toBe('party');
    expect(reference?.displayKey).toBe('name');
    expect(reference?.fallbacks).toHaveLength(1);
    expect(sources.map((source) => source.table)).toEqual([
      'party',
      'customer',
    ]);
  });

  it('supports per-table fallback display configuration', () => {
    const schema = z.string().references('party', {
      displayField: 'name',
      fallbacks: [{ table: 'customer', displayField: 'phone' }],
    });
    const sources = getSchemaReferenceSources(getSchemaReferenceConfig(schema));

    expect(sources[0]).toMatchObject({
      table: 'party',
      displayKey: 'name',
    });
    expect(sources[1]).toMatchObject({
      table: 'customer',
      displayKey: 'phone',
    });
  });

  it('supports static value labels for references', () => {
    const schema = z.string().references('party', {
      displayField: 'name',
      valueLabels: {
        __UNASSIGNED__: 'Unassigned',
      },
    });
    const sources = getSchemaReferenceSources(getSchemaReferenceConfig(schema));

    expect(sources[0]).toMatchObject({
      table: 'party',
      displayKey: 'name',
      valueLabels: {
        __UNASSIGNED__: 'Unassigned',
      },
    });
  });

  it('stores and resolves number references metadata', () => {
    const schema = z.number().references('party', {
      displayKey: 'name',
      valueKey: 'panNumber',
    });
    const reference = getSchemaReferenceConfig(schema);

    expect(reference?.table).toBe('party');
    expect(reference?.valueKey).toBe('panNumber');
  });

  it('infers select field type from references metadata', () => {
    const schema = z.object({
      partyId: z.string().references('party', { displayKey: 'name' }),
    });
    const parsed = parseSchema(schema as never);
    const partyField = parsed.fields.find((field) => field.key === 'partyId');
    const customData = partyField?.fieldConfig?.customData as
      | { reference?: { table?: string } }
      | undefined;

    expect(partyField?.type).toBe('select');
    expect(customData?.reference?.table).toBe('party');
  });

  it('works when references is called on wrapped string schemas', () => {
    const schema = z
      .string()
      .optional()
      .describe('Counterparty')
      .references('party', { displayKey: 'name' });
    const reference = getSchemaReferenceConfig(schema);

    expect(reference?.table).toBe('party');
    expect(reference?.displayKey).toBe('name');
  });

  it('throws when references is used on non string/number schemas', () => {
    expect(() =>
      z.object({ id: z.string() }).references('party', { displayKey: 'name' }),
    ).toThrow(
      'references() can only be used on z.string/z.number schemas (including wrapped variants).',
    );
  });
});
