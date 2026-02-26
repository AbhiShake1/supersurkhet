import type { ExpressionOpDoc, ExpressionRefDoc } from '@supersurkhet/sdk';
import type { DeriveIR, ExpressionDoc, SchemaDoc } from '@/lib/plugins/types';

export const DERIVED_FIELD_SOURCE_OPTIONS = [
  'payload',
  'formValues',
  'context',
  'sourceRow',
  'row',
] as const;

export const DERIVED_FIELD_OPERATION_OPTIONS = [
  'coalesce',
  'concat',
  'sum',
] as const;

export type DerivedFieldSource = (typeof DERIVED_FIELD_SOURCE_OPTIONS)[number];

export type DerivedFieldOperation =
  (typeof DERIVED_FIELD_OPERATION_OPTIONS)[number];

export type SchemaBuilderDerivedFieldSource = {
  id: string;
  source: DerivedFieldSource;
  path: string;
};

export type SchemaBuilderDerivedField = {
  id: string;
  targetFieldKey: string;
  target: 'value' | 'inputProps' | 'customData';
  key: string;
  operation: DerivedFieldOperation;
  sources: SchemaBuilderDerivedFieldSource[];
  fallbackValue?: string;
};

export function parseDerivedFieldsFromSchemaDoc(
  schemaDoc: SchemaDoc,
): SchemaBuilderDerivedField[] {
  const results: SchemaBuilderDerivedField[] = [];

  for (const field of schemaDoc.fields ?? []) {
    const fieldKey = field.key?.trim() ?? '';
    if (!fieldKey) {
      continue;
    }

    for (const derivation of field.behavior?.derivations ?? []) {
      const expression = parseDerivationExpression(derivation.expression);
      if (!expression) {
        continue;
      }

      results.push({
        id: createDerivedFieldId(),
        targetFieldKey: fieldKey,
        target: derivation.target,
        key: typeof derivation.key === 'string' ? derivation.key : '',
        operation: expression.operation,
        sources: expression.sources,
        fallbackValue: expression.fallbackValue,
      });
    }
  }

  return results;
}

export function compileDerivedFieldToDeriveIr(
  derivedField: SchemaBuilderDerivedField,
): DeriveIR | null {
  const refs = derivedField.sources
    .map((source) => {
      const path = source.path
        .split('.')
        .map((segment) => segment.trim())
        .filter(Boolean);

      if (!path.length) {
        return null;
      }

      return {
        kind: 'ref' as const,
        source: source.source,
        path,
      };
    })
    .filter((value): value is ExpressionRefDoc => value !== null);

  if (refs.length === 0) {
    return null;
  }

  const fallback = normalizeFallback(derivedField.fallbackValue);
  let expression: ExpressionDoc;

  if (
    derivedField.operation === 'coalesce' &&
    refs.length === 1 &&
    fallback === undefined
  ) {
    expression = refs[0];
  } else {
    const args: ExpressionDoc[] = [...refs];
    if (derivedField.operation === 'coalesce' && fallback !== undefined) {
      args.push(fallback);
    }
    expression = {
      kind: 'op',
      op: derivedField.operation,
      args,
    };
  }

  return {
    target: derivedField.target,
    key: derivedField.key.trim() || undefined,
    expression,
  };
}

function parseDerivationExpression(expression: ExpressionDoc): {
  operation: DerivedFieldOperation;
  sources: SchemaBuilderDerivedFieldSource[];
  fallbackValue?: string;
} | null {
  if (isExpressionRef(expression)) {
    return {
      operation: 'coalesce',
      sources: [
        {
          id: createDerivedFieldId(),
          source: expression.source,
          path: expression.path.join('.'),
        },
      ],
    };
  }

  if (!isExpressionOp(expression)) {
    return null;
  }

  if (!isDerivedFieldOperation(expression.op)) {
    return null;
  }

  const sources: SchemaBuilderDerivedFieldSource[] = [];
  let fallbackValue: string | undefined;

  for (let index = 0; index < expression.args.length; index += 1) {
    const arg = expression.args[index];
    if (isExpressionRef(arg)) {
      sources.push({
        id: createDerivedFieldId(),
        source: arg.source,
        path: arg.path.join('.'),
      });
      continue;
    }

    const isLastArgument = index === expression.args.length - 1;
    if (expression.op === 'coalesce' && isLastArgument) {
      fallbackValue = expressionLiteralToString(arg);
      continue;
    }

    return null;
  }

  if (sources.length === 0) {
    return null;
  }

  return {
    operation: expression.op,
    sources,
    fallbackValue,
  };
}

function expressionLiteralToString(value: ExpressionDoc): string | undefined {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (value === true) return 'true';
  if (value === false) return 'false';
  return undefined;
}

function normalizeFallback(
  value: string | undefined,
): ExpressionDoc | undefined {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return undefined;
  }

  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return asNumber;
  }

  return trimmed;
}

function isExpressionRef(
  expression: ExpressionDoc,
): expression is ExpressionRefDoc {
  return (
    typeof expression === 'object' &&
    expression !== null &&
    'kind' in expression &&
    expression.kind === 'ref' &&
    DERIVED_FIELD_SOURCE_OPTIONS.includes(expression.source)
  );
}

function isExpressionOp(
  expression: ExpressionDoc,
): expression is ExpressionOpDoc {
  return (
    typeof expression === 'object' &&
    expression !== null &&
    'kind' in expression &&
    expression.kind === 'op' &&
    Array.isArray(expression.args)
  );
}

function isDerivedFieldOperation(
  operation: ExpressionOpDoc['op'],
): operation is DerivedFieldOperation {
  return DERIVED_FIELD_OPERATION_OPTIONS.includes(
    operation as DerivedFieldOperation,
  );
}

function createDerivedFieldId() {
  return `derived_${Math.random().toString(36).slice(2, 10)}`;
}
