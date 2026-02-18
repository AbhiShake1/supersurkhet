import type {
  FieldEntity,
  FieldEntityId,
  SchemaEntity,
  SchemaEntityId,
} from '../../domain/workspace/workspace-entities';

export type SchemaTreeNodeKind = 'object' | 'array' | 'leaf';

export type SchemaFieldTreeNode = {
  fieldId: FieldEntityId;
  key: string;
  type: FieldEntity['type'];
  nodeKind: SchemaTreeNodeKind;
  children: SchemaFieldTreeNode[];
};

export type SchemasTabState = {
  schemas: SchemaEntity[];
  activeSchemaId: SchemaEntityId | null;
  expandedFieldIds: FieldEntityId[];
};

export type CreateSchemasTabStateInput = {
  schemas: SchemaEntity[];
  activeSchemaId?: SchemaEntityId | null;
  expandedFieldIds?: FieldEntityId[];
};

export type BuildSchemaFieldTreeInput = {
  schema: SchemaEntity;
  fields: FieldEntity[];
};

export type SchemasTabProps = {
  schemas: SchemaEntity[];
  fields: FieldEntity[];
  activeSchemaId: SchemaEntityId | null;
  expandedFieldIds: FieldEntityId[];
};

export function createSchemasTabState(
  input: CreateSchemasTabStateInput,
): SchemasTabState {
  return {
    schemas: [...input.schemas],
    activeSchemaId: resolveActiveSchemaId(input.schemas, input.activeSchemaId),
    expandedFieldIds: [...(input.expandedFieldIds ?? [])],
  };
}

export function addSchemaToTabState(
  state: SchemasTabState,
  schema: SchemaEntity,
): SchemasTabState {
  if (state.schemas.some((existing) => existing.id === schema.id)) {
    throw new Error(`Schema already exists: ${schema.id}`);
  }

  return {
    ...state,
    schemas: [...state.schemas, schema],
    activeSchemaId: schema.id,
  };
}

export function removeSchemaFromTabState(
  state: SchemasTabState,
  schemaId: SchemaEntityId,
): SchemasTabState {
  if (!state.schemas.some((schema) => schema.id === schemaId)) {
    throw new Error(`Cannot remove unknown schema: ${schemaId}`);
  }

  const schemas = state.schemas.filter((schema) => schema.id !== schemaId);
  const activeSchemaId =
    state.activeSchemaId === schemaId
      ? resolveActiveSchemaId(schemas)
      : state.activeSchemaId;

  return {
    ...state,
    schemas,
    activeSchemaId,
  };
}

export function renameSchemaInTabState(
  state: SchemasTabState,
  schemaId: SchemaEntityId,
  title: string,
): SchemasTabState {
  let found = false;
  const schemas = state.schemas.map((schema) => {
    if (schema.id !== schemaId) {
      return schema;
    }
    found = true;
    return {
      ...schema,
      title,
    };
  });

  if (!found) {
    throw new Error(`Cannot rename unknown schema: ${schemaId}`);
  }

  return {
    ...state,
    schemas,
  };
}

export function buildSchemaFieldTree(
  input: BuildSchemaFieldTreeInput,
): SchemaFieldTreeNode[] {
  const fieldById = toFieldMap(input.fields, input.schema.id);
  const itemFieldIds = new Set<FieldEntityId>();

  for (const field of fieldById.values()) {
    if (field.itemFieldId) {
      itemFieldIds.add(field.itemFieldId);
    }
  }

  const rootFields = input.schema.fieldIds
    .map((fieldId) => fieldById.get(fieldId))
    .filter((field): field is FieldEntity => Boolean(field))
    .filter((field) => !field.parentFieldId && !itemFieldIds.has(field.id));

  return rootFields.map((field) =>
    buildTreeNode(field, fieldById, new Set<FieldEntityId>()),
  );
}

export function toggleExpandedFieldIds(
  expandedFieldIds: readonly FieldEntityId[],
  fieldId: FieldEntityId,
  onExpandedFieldIdsChange?: (expandedFieldIds: FieldEntityId[]) => void,
): FieldEntityId[] {
  const nextSet = new Set<FieldEntityId>(expandedFieldIds);
  if (nextSet.has(fieldId)) {
    nextSet.delete(fieldId);
  } else {
    nextSet.add(fieldId);
  }

  const next = [...nextSet].sort();
  onExpandedFieldIdsChange?.(next);
  return next;
}

export function pruneExpandedFieldIds(
  expandedFieldIds: readonly FieldEntityId[],
  schema: SchemaEntity,
  fields: readonly FieldEntity[],
): FieldEntityId[] {
  const validFieldIds = new Set<FieldEntityId>(
    fields
      .filter((field) => field.schemaId === schema.id)
      .map((field) => field.id),
  );

  return expandedFieldIds.filter((fieldId) => validFieldIds.has(fieldId));
}

export function SchemasTab({
  schemas,
  fields,
  activeSchemaId,
  expandedFieldIds,
}: SchemasTabProps) {
  const activeSchema =
    schemas.find((schema) => schema.id === activeSchemaId) ??
    schemas[0] ??
    null;
  const tree = activeSchema
    ? buildSchemaFieldTree({
        schema: activeSchema,
        fields,
      })
    : [];

  return (
    <section aria-label="Schemas tab">
      <h2>Schemas</h2>

      <article>
        <h3>Schema List</h3>
        {schemas.length === 0 ? (
          <p>No schemas available</p>
        ) : (
          <ul>
            {schemas.map((schema) => (
              <li key={schema.id}>
                <span>{schema.title ?? schema.schemaId}</span>{' '}
                <span>
                  {schema.id === activeSchema?.id ? '(active)' : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article>
        <h3>Schema Tree</h3>
        {activeSchema ? (
          tree.length > 0 ? (
            <ul>
              {tree.map((node) => renderTreeNode(node, expandedFieldIds, 0))}
            </ul>
          ) : (
            <p>No fields in selected schema</p>
          )
        ) : (
          <p>No active schema selected</p>
        )}
      </article>
    </section>
  );
}

function resolveActiveSchemaId(
  schemas: readonly SchemaEntity[],
  activeSchemaId?: SchemaEntityId | null,
): SchemaEntityId | null {
  if (
    activeSchemaId &&
    schemas.some((schema) => schema.id === activeSchemaId)
  ) {
    return activeSchemaId;
  }
  return schemas[0]?.id ?? null;
}

function toFieldMap(
  fields: readonly FieldEntity[],
  schemaId: SchemaEntityId,
): Map<FieldEntityId, FieldEntity> {
  const map = new Map<FieldEntityId, FieldEntity>();
  for (const field of fields) {
    if (field.schemaId === schemaId) {
      map.set(field.id, field);
    }
  }
  return map;
}

function buildTreeNode(
  field: FieldEntity,
  fieldById: Map<FieldEntityId, FieldEntity>,
  visited: Set<FieldEntityId>,
): SchemaFieldTreeNode {
  if (visited.has(field.id)) {
    return {
      fieldId: field.id,
      key: field.key,
      type: field.type,
      nodeKind: deriveNodeKind(field),
      children: [],
    };
  }

  const nextVisited = new Set<FieldEntityId>(visited);
  nextVisited.add(field.id);

  const childIds = collectChildFieldIds(field);
  const children = childIds
    .map((childId) => fieldById.get(childId))
    .filter((child): child is FieldEntity => Boolean(child))
    .map((child) => buildTreeNode(child, fieldById, nextVisited));

  return {
    fieldId: field.id,
    key: field.key,
    type: field.type,
    nodeKind: deriveNodeKind(field),
    children,
  };
}

function collectChildFieldIds(field: FieldEntity): FieldEntityId[] {
  if (field.type === 'array') {
    return field.itemFieldId ? [field.itemFieldId] : [];
  }

  if (!field.childFieldIds || field.childFieldIds.length === 0) {
    return [];
  }

  return [...field.childFieldIds];
}

function deriveNodeKind(field: FieldEntity): SchemaTreeNodeKind {
  if (field.type === 'object') {
    return 'object';
  }
  if (field.type === 'array') {
    return 'array';
  }
  return 'leaf';
}

function renderTreeNode(
  node: SchemaFieldTreeNode,
  expandedFieldIds: readonly FieldEntityId[],
  depth: number,
) {
  const isExpanded = expandedFieldIds.includes(node.fieldId);

  return (
    <li key={node.fieldId}>
      <span>{' '.repeat(depth * 2)}</span>
      <span>{node.key}</span> <span>[{node.nodeKind}]</span>
      {node.children.length > 0 && isExpanded ? (
        <ul>
          {node.children.map((child) =>
            renderTreeNode(child, expandedFieldIds, depth + 1),
          )}
        </ul>
      ) : null}
    </li>
  );
}
