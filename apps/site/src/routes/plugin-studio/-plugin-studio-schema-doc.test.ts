import { describe, expect, it } from 'vitest';
import { parseStoredSchemaDoc } from './-plugin-studio-schema-doc';

describe('plugin studio schema doc parser', () => {
  it('parses valid schema docs from JSON strings', () => {
    const parsed = parseStoredSchemaDoc(
      JSON.stringify({
        schemaId: 'plugin.orders',
        title: 'Orders',
        fields: [{ key: 'name', type: 'string' }],
      }),
    );

    expect(parsed).toEqual({
      schemaId: 'plugin.orders',
      title: 'Orders',
      fields: [{ key: 'name', type: 'string' }],
    });
  });

  it('normalizes malformed fields to an array', () => {
    const parsed = parseStoredSchemaDoc({
      schemaId: 'plugin.orders',
      fields: { key: 'name', type: 'string' },
    });

    expect(parsed).toEqual({
      schemaId: 'plugin.orders',
      fields: [],
    });
  });

  it('drops malformed field entries while keeping valid ones', () => {
    const parsed = parseStoredSchemaDoc({
      schemaId: 'plugin.orders',
      fields: [
        { key: 'title', type: 'string' },
        { key: 12, type: 'string' },
        null,
      ],
    });

    expect(parsed).toEqual({
      schemaId: 'plugin.orders',
      fields: [{ key: 'title', type: 'string' }],
    });
  });

  it('preserves valid schema-owned workflows', () => {
    const parsed = parseStoredSchemaDoc({
      schemaId: 'plugin.orders',
      fields: [{ key: 'title', type: 'string' }],
      workflows: [
        {
          workflowId: 'afterCreate',
          hook: 'afterCreate',
          nodes: [{ nodeId: 'n1', type: 'action', actionId: 'orders.audit' }],
          edges: [],
        },
      ],
    });

    expect(parsed?.workflows?.length).toBe(1);
    expect(parsed?.workflows?.[0]?.workflowId).toBe('afterCreate');
  });

  it('filters malformed schema-owned workflows', () => {
    const parsed = parseStoredSchemaDoc({
      schemaId: 'plugin.orders',
      fields: [{ key: 'title', type: 'string' }],
      workflows: [
        {
          workflowId: 'afterCreate',
          hook: 'afterCreate',
          nodes: [{ nodeId: 'n1', type: 'action', actionId: 'orders.audit' }],
          edges: [],
        },
        { workflowId: '', hook: 'afterCreate', nodes: [], edges: [] },
        { workflowId: 'missing-nodes', hook: 'afterCreate' },
      ],
    });

    expect(parsed?.workflows).toHaveLength(1);
    expect(parsed?.workflows?.[0]?.workflowId).toBe('afterCreate');
  });

  it('returns undefined for malformed JSON payloads', () => {
    expect(parseStoredSchemaDoc('{')).toBeUndefined();
  });

  it('returns undefined when schema id is missing', () => {
    expect(
      parseStoredSchemaDoc({
        fields: [{ key: 'title', type: 'string' }],
      }),
    ).toBeUndefined();
  });
});
