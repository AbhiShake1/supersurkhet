import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type {
  FieldEntity,
  FieldEntityId,
  SchemaEntity,
  SchemaEntityId,
} from '../../domain/workspace/workspace-entities';
import {
  addSchemaToTabState,
  buildSchemaFieldTree,
  createSchemasTabState,
  pruneExpandedFieldIds,
  removeSchemaFromTabState,
  renameSchemaInTabState,
  SchemasTab,
  toggleExpandedFieldIds,
} from './schemas-tab';

function createSchema(input: {
  id: SchemaEntityId;
  schemaId: string;
  title: string;
  fieldIds: FieldEntityId[];
}): SchemaEntity {
  return {
    id: input.id,
    schemaId: input.schemaId,
    title: input.title,
    description: undefined,
    fieldIds: input.fieldIds,
    refinementIds: [],
  };
}

function createField(input: {
  id: FieldEntityId;
  schemaId: SchemaEntityId;
  key: string;
  type: FieldEntity['type'];
  parentFieldId?: FieldEntityId;
  childFieldIds?: FieldEntityId[];
  itemFieldId?: FieldEntityId;
}): FieldEntity {
  return {
    id: input.id,
    schemaId: input.schemaId,
    key: input.key,
    type: input.type,
    parentFieldId: input.parentFieldId,
    childFieldIds: input.childFieldIds,
    itemFieldId: input.itemFieldId,
    optional: undefined,
    derivationIds: [],
    refinementIds: [],
  };
}

describe('schemas-tab', () => {
  const schemaA = createSchema({
    id: 'schema_order',
    schemaId: 'order',
    title: 'Order',
    fieldIds: [
      'field_customer',
      'field_items',
      'field_item',
      'field_item_sku',
      'field_item_meta',
      'field_item_meta_color',
    ],
  });

  const schemaB = createSchema({
    id: 'schema_invoice',
    schemaId: 'invoice',
    title: 'Invoice',
    fieldIds: [],
  });

  const fields: FieldEntity[] = [
    createField({
      id: 'field_customer',
      schemaId: 'schema_order',
      key: 'customer',
      type: 'string',
    }),
    createField({
      id: 'field_items',
      schemaId: 'schema_order',
      key: 'items',
      type: 'array',
      itemFieldId: 'field_item',
    }),
    createField({
      id: 'field_item',
      schemaId: 'schema_order',
      key: 'item',
      type: 'object',
      parentFieldId: 'field_items',
      childFieldIds: ['field_item_sku', 'field_item_meta'],
    }),
    createField({
      id: 'field_item_sku',
      schemaId: 'schema_order',
      key: 'sku',
      type: 'string',
      parentFieldId: 'field_item',
    }),
    createField({
      id: 'field_item_meta',
      schemaId: 'schema_order',
      key: 'meta',
      type: 'object',
      parentFieldId: 'field_item',
      childFieldIds: ['field_item_meta_color'],
    }),
    createField({
      id: 'field_item_meta_color',
      schemaId: 'schema_order',
      key: 'color',
      type: 'string',
      parentFieldId: 'field_item_meta',
    }),
  ];

  it('builds nested tree navigation for object and array fields', () => {
    const tree = buildSchemaFieldTree({
      schema: schemaA,
      fields,
    });

    expect(tree).toHaveLength(2);
    expect(tree[0]).toMatchObject({
      fieldId: 'field_customer',
      key: 'customer',
      nodeKind: 'leaf',
    });
    expect(tree[1]).toMatchObject({
      fieldId: 'field_items',
      key: 'items',
      nodeKind: 'array',
    });
    expect(tree[1].children[0]).toMatchObject({
      fieldId: 'field_item',
      nodeKind: 'object',
    });
    expect(tree[1].children[0].children.map((child) => child.fieldId)).toEqual([
      'field_item_sku',
      'field_item_meta',
    ]);
    expect(tree[1].children[0].children[1].children[0]).toMatchObject({
      fieldId: 'field_item_meta_color',
      nodeKind: 'leaf',
    });
  });

  it('supports schema CRUD operations with active schema tracking', () => {
    const created = createSchemasTabState({
      schemas: [schemaA],
      activeSchemaId: 'schema_order',
      expandedFieldIds: [],
    });

    const withAdd = addSchemaToTabState(created, schemaB);
    expect(withAdd.schemas.map((schema) => schema.id)).toEqual([
      'schema_order',
      'schema_invoice',
    ]);
    expect(withAdd.activeSchemaId).toBe('schema_invoice');

    const withRename = renameSchemaInTabState(
      withAdd,
      'schema_invoice',
      'Invoice v2',
    );
    expect(
      withRename.schemas.find((schema) => schema.id === 'schema_invoice')
        ?.title,
    ).toBe('Invoice v2');

    const withRemove = removeSchemaFromTabState(withRename, 'schema_invoice');
    expect(withRemove.schemas.map((schema) => schema.id)).toEqual([
      'schema_order',
    ]);
    expect(withRemove.activeSchemaId).toBe('schema_order');
  });

  it('throws when removing unknown schema', () => {
    const state = createSchemasTabState({
      schemas: [schemaA],
      activeSchemaId: 'schema_order',
      expandedFieldIds: [],
    });

    expect(() => removeSchemaFromTabState(state, 'schema_unknown')).toThrow(
      'Cannot remove unknown schema: schema_unknown',
    );
  });

  it('prunes and persists expanded tree state through callback hooks', () => {
    const onExpandedFieldIdsChange = vi.fn();

    const expanded = toggleExpandedFieldIds(
      ['field_item'],
      'field_items',
      onExpandedFieldIdsChange,
    );

    expect(expanded).toEqual(['field_item', 'field_items']);
    expect(onExpandedFieldIdsChange).toHaveBeenCalledWith([
      'field_item',
      'field_items',
    ]);

    expect(
      pruneExpandedFieldIds(['field_item', 'field_unknown'], schemaA, fields),
    ).toEqual(['field_item']);
  });

  it('renders schemas and current schema tree', () => {
    const html = renderToStaticMarkup(
      <SchemasTab
        schemas={[schemaA, schemaB]}
        fields={fields}
        activeSchemaId="schema_order"
        expandedFieldIds={['field_items', 'field_item', 'field_item_meta']}
      />,
    );

    expect(html).toContain('Schemas');
    expect(html).toContain('Order');
    expect(html).toContain('Invoice');
    expect(html).toContain('items');
    expect(html).toContain('meta');
    expect(html).toContain('color');
  });
});
