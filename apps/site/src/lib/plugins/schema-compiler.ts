import { z } from 'zod';
import { fieldConfig } from '@/components/ui/autoform';
import { evaluateExpression, isLikelyExpressionDoc } from '@/lib/plugins/ir-evaluator';
import type {
  DeriveIR,
  ExpressionDoc,
  JsonValue,
  RefineIssueIR,
  SchemaDoc,
  SchemaFieldDoc,
  SchemaRuleDoc,
} from '@/lib/plugins/types';

export type SchemaRuleTokenHandler = (
  schema: z.ZodTypeAny,
  rule: SchemaRuleDoc,
  field: SchemaFieldDoc,
) => z.ZodTypeAny;

export type CompiledSchema =
  | z.ZodObject<any>
  | z.ZodEffects<z.ZodObject<any>>;

export type SchemaTokenHandler = (schemaDoc: SchemaDoc) => CompiledSchema;

export type SchemaCompilerOptions = {
  ruleTokenHandlers?: Record<string, SchemaRuleTokenHandler>;
  schemaTokenHandlers?: Record<string, SchemaTokenHandler>;
};

function applyRule(
  schema: z.ZodTypeAny,
  rule: SchemaRuleDoc,
  field: SchemaFieldDoc,
  options?: SchemaCompilerOptions,
): z.ZodTypeAny {
  switch (rule.kind) {
    case 'min': {
      const minValue = Number(rule.value ?? 0);
      if (schema instanceof z.ZodString) return schema.min(minValue);
      if (schema instanceof z.ZodArray) return schema.min(minValue);
      if (schema instanceof z.ZodNumber) return schema.min(minValue);
      return schema;
    }
    case 'max': {
      const maxValue = Number(rule.value ?? 0);
      if (schema instanceof z.ZodString) return schema.max(maxValue);
      if (schema instanceof z.ZodArray) return schema.max(maxValue);
      if (schema instanceof z.ZodNumber) return schema.max(maxValue);
      return schema;
    }
    case 'nonnegative':
      return schema instanceof z.ZodNumber ? schema.nonnegative() : schema;
    case 'positive':
      return schema instanceof z.ZodNumber ? schema.positive() : schema;
    case 'int':
      return schema instanceof z.ZodNumber ? schema.int() : schema;
    case 'customToken': {
      if (!rule.token) return schema;
      const handler = options?.ruleTokenHandlers?.[rule.token];
      return handler ? handler(schema, rule, field) : schema;
    }
    default:
      return schema;
  }
}

function resolveDefaultToken(token: string): (() => unknown) | undefined {
  switch (token) {
    case 'now.iso':
      return () => new Date().toISOString();
    case 'now.unix':
      return () => Math.floor(Date.now() / 1000);
    case 'empty.array':
      return () => [];
    case 'empty.object':
      return () => ({});
    default:
      return undefined;
  }
}

function withOptionalAndDefault(
  schema: z.ZodTypeAny,
  field: SchemaFieldDoc,
): z.ZodTypeAny {
  const defaultToken =
    typeof field.tokens?.defaultToken === 'string'
      ? field.tokens.defaultToken
      : undefined;
  const defaultTokenFactory = defaultToken
    ? resolveDefaultToken(defaultToken)
    : undefined;

  let next = schema;
  if (defaultTokenFactory) {
    next = next.default(defaultTokenFactory as never);
  } else if (field.defaultValue !== undefined) {
    next = next.default(field.defaultValue as never);
  }
  if (field.optional) {
    next = next.optional();
  }
  return next;
}

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, input);
}

function evaluateConfigValue(
  value: JsonValue | ExpressionDoc,
  context: {
    payload?: unknown;
    formValues?: unknown;
    context?: unknown;
    sourceRow?: unknown;
    row?: unknown;
  },
) {
  if (!isLikelyExpressionDoc(value)) {
    return value;
  }
  return evaluateExpression(value as ExpressionDoc, context);
}

function compileDeriveFunction(derivations: DeriveIR[]) {
  return (runtimeContext: {
    payload?: unknown;
    formValues?: unknown;
    sourceRow?: unknown;
    rowPath?: string[];
  }) => {
    const row = getValueAtPath(
      runtimeContext.formValues,
      runtimeContext.rowPath ?? [],
    );
    const expressionContext = {
      payload: runtimeContext.payload ?? runtimeContext.formValues,
      formValues: runtimeContext.formValues,
      context: runtimeContext,
      sourceRow: runtimeContext.sourceRow,
      row,
    };

    const derived: Record<string, unknown> = {};
    for (const derivation of derivations) {
      const evaluated = evaluateExpression(derivation.expression, expressionContext);
      if (derivation.target === 'value') {
        derived.value = evaluated;
        continue;
      }

      if (!derived[derivation.target]) {
        derived[derivation.target] = {};
      }
      const target = derived[derivation.target] as Record<string, unknown>;
      if (derivation.key) {
        target[derivation.key] = evaluated;
      } else if (evaluated && typeof evaluated === 'object') {
        Object.assign(target, evaluated);
      }
    }
    return derived;
  };
}

function applyFieldBehavior(
  schema: z.ZodTypeAny,
  field: SchemaFieldDoc,
): z.ZodTypeAny {
  const behavior = field.behavior;
  if (!behavior) return schema;

  const configInput: Record<string, unknown> = {};
  if (behavior.fieldConfig?.fieldType) {
    configInput.fieldType = behavior.fieldConfig.fieldType;
  }
  if (behavior.fieldConfig?.label) {
    configInput.label = behavior.fieldConfig.label;
  }
  if (behavior.fieldConfig?.description) {
    configInput.description = behavior.fieldConfig.description;
  }
  if (behavior.fieldConfig?.inputProps) {
    configInput.inputProps = Object.fromEntries(
      Object.entries(behavior.fieldConfig.inputProps).map(([key, value]) => [
        key,
        evaluateConfigValue(value, {}),
      ]),
    );
  }

  const customData: Record<string, unknown> = {};
  if (behavior.fieldConfig?.customData) {
    Object.assign(customData, behavior.fieldConfig.customData);
  }
  if (behavior.derivations?.length) {
    customData.derive = compileDeriveFunction(behavior.derivations);
  }
  if (Object.keys(customData).length > 0) {
    configInput.customData = customData;
  }

  let next = schema;
  if (Object.keys(configInput).length > 0) {
    next = next.superRefine(fieldConfig(configInput));
  }

  if (behavior.refinements?.length) {
    next = next.superRefine((value, ctx) => {
      for (const refinement of behavior.refinements ?? []) {
        const shouldIssue = Boolean(
          evaluateExpression(refinement.when, { payload: value }),
        );
        if (!shouldIssue) continue;
        ctx.addIssue({
          code: 'custom',
          message: refinement.message,
          path: refinement.path,
        });
      }
    });
  }

  return next;
}

function applySchemaRefinements(
  schema: z.ZodTypeAny,
  refinements: RefineIssueIR[] | undefined,
): z.ZodTypeAny {
  if (!refinements?.length) return schema;
  return schema.superRefine((payload, ctx) => {
    for (const refinement of refinements) {
      const shouldIssue = Boolean(
        evaluateExpression(refinement.when, {
          payload,
        }),
      );
      if (!shouldIssue) continue;
      ctx.addIssue({
        code: 'custom',
        message: refinement.message,
        path: refinement.path,
      });
    }
  });
}

function compileFieldDefinition(
  field: SchemaFieldDoc,
  options?: SchemaCompilerOptions,
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (field.type) {
    case 'string':
    case 'richText':
    case 'editor':
    case 'color':
    case 'file':
    case 'password':
    case 'phone':
    case 'url':
    case 'image':
    case 'map':
    case 'unit':
      schema = z.string();
      break;
    case 'date':
      schema = z.string();
      break;
    case 'datetime':
      schema = z.string().datetime({ offset: true });
      break;
    case 'number':
    case 'currency':
    case 'slider':
    case 'rating':
    case 'timestamp':
      schema = z.number({ coerce: true });
      break;
    case 'boolean':
      schema = z.boolean();
      break;
    case 'select':
      if (field.enumValues?.length) {
        schema = z.enum(field.enumValues as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;
    case 'enum':
      schema = z.enum((field.enumValues ?? ['value']) as [string, ...string[]]);
      break;
    case 'record':
      schema = z.record(z.string(), z.unknown());
      break;
    case 'permissions':
      schema = z.record(z.string(), z.boolean());
      break;
    case 'tags':
      schema = z.array(z.string());
      break;
    case 'array': {
      const itemType = field.itemType ?? { type: 'string' };
      schema = z.array(
        compileFieldDefinition(
          {
            key: `${field.key}.item`,
            ...itemType,
          },
          options,
        ),
      );
      break;
    }
    case 'object': {
      const nestedShape = Object.fromEntries(
        (field.fields ?? []).map((nestedField) => [
          nestedField.key,
          compileFieldDefinition(nestedField, options),
        ]),
      );
      schema = z.object(nestedShape);
      break;
    }
    default:
      schema = z.unknown();
      break;
  }

  if (field.description) {
    schema = schema.describe(field.description);
  }

  for (const rule of field.rules ?? []) {
    schema = applyRule(schema, rule, field, options);
  }

  schema = applyFieldBehavior(schema, field);
  return withOptionalAndDefault(schema, field);
}

export function compileSchemaDoc(
  schemaDoc: SchemaDoc,
  options?: SchemaCompilerOptions,
): CompiledSchema {
  const schemaBuilderToken =
    typeof schemaDoc.tokens?.schemaBuilderToken === 'string'
      ? schemaDoc.tokens.schemaBuilderToken
      : undefined;
  if (schemaBuilderToken) {
    const tokenHandler = options?.schemaTokenHandlers?.[schemaBuilderToken];
    if (tokenHandler) {
      return tokenHandler(schemaDoc);
    }
  }

  const shape = Object.fromEntries(
    schemaDoc.fields.map((field) => [
      field.key,
      compileFieldDefinition(field, options),
    ]),
  );
  return applySchemaRefinements(
    z.object(shape),
    schemaDoc.refinements,
  ) as CompiledSchema;
}

export function compileSchemaDocs(
  schemaDocs: SchemaDoc[],
  options?: SchemaCompilerOptions,
) {
  return Object.fromEntries(
    schemaDocs.map((schemaDoc) => [
      schemaDoc.schemaId,
      compileSchemaDoc(schemaDoc, options),
    ]),
  );
}
