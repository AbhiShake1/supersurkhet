import type { UseFormReturn } from 'react-hook-form';
import {
  evaluateExpression,
  isLikelyExpressionDoc,
} from '@/lib/plugins/ir-evaluator';
import type { ExpressionDoc, JsonValue } from '@/lib/plugins/types';
import type { FieldConfigCustomData } from './utils';

type OnValueChangePlan = Extract<
  NonNullable<FieldConfigCustomData['onValueChange']>,
  { actions: unknown[] }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOnValueChangePlan(value: unknown): value is OnValueChangePlan {
  return isRecord(value) && Array.isArray(value.actions);
}

function evaluateMaybeExpression(
  value: JsonValue | ExpressionDoc | undefined,
  context: {
    payload: unknown;
    formValues: unknown;
    context: Record<string, unknown>;
  },
) {
  if (value === undefined) return undefined;
  if (!isLikelyExpressionDoc(value)) return value;
  return evaluateExpression(value as ExpressionDoc, context);
}

function evaluateRecord(
  value: Record<string, JsonValue | ExpressionDoc> | undefined,
  context: {
    payload: unknown;
    formValues: unknown;
    context: Record<string, unknown>;
  },
): Record<string, unknown> {
  if (!value) return {};
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [
      key,
      evaluateMaybeExpression(entry, context),
    ]),
  );
}

function evaluateKeys(
  value: string[] | ExpressionDoc | undefined,
  context: {
    payload: unknown;
    formValues: unknown;
    context: Record<string, unknown>;
  },
): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry));
  const evaluated = evaluateMaybeExpression(value, context);
  if (Array.isArray(evaluated)) {
    return evaluated.map((entry) => String(entry));
  }
  if (typeof evaluated === 'string' && evaluated.trim()) {
    return [evaluated.trim()];
  }
  return [];
}

async function executePlan(
  plan: OnValueChangePlan,
  params: {
    value: unknown;
    path: string[];
    form: UseFormReturn;
    businessBasePath?: string;
  },
) {
  const formValues = params.form.getValues();
  let lastResult: unknown;
  const baseContext = {
    payload: params.value,
    formValues,
    context: {
      value: params.value,
      path: params.path,
      businessBasePath: params.businessBasePath ?? '',
      lastResult: undefined as unknown,
    },
  };

  const { db } = await import('@/lib/ssr/api');

  for (const action of plan.actions) {
    try {
      const evalContext = {
        ...baseContext,
        context: {
          ...baseContext.context,
          lastResult,
        },
      };

      if (action.type === 'form.setValue') {
        const fieldPath = evaluateMaybeExpression(action.field, evalContext);
        const nextValue = evaluateMaybeExpression(action.value, evalContext);
        if (typeof fieldPath === 'string' && fieldPath.trim()) {
          params.form.setValue(fieldPath, nextValue, {
            shouldDirty: action.shouldDirty ?? true,
            shouldTouch: action.shouldTouch ?? true,
            shouldValidate: action.shouldValidate ?? false,
          });
        }
        lastResult = nextValue;
        continue;
      }

      const tableApi = (db as Record<string, unknown>)[action.table] as
        | {
            get?: (opts?: Record<string, unknown>) => Promise<unknown> | unknown;
            create?: (...keys: string[]) => (data: unknown) => Promise<unknown> | unknown;
            update?: (...keys: string[]) => (data: unknown) => Promise<unknown> | unknown;
            remove?: (...keys: string[]) => (id: string) => Promise<unknown> | unknown;
          }
        | undefined;
      if (!tableApi) continue;

      const keys = [
        ...(params.businessBasePath ? [params.businessBasePath] : []),
        ...evaluateKeys('keys' in action ? action.keys : undefined, evalContext),
      ];
      const withKeys = keys.filter((entry) => entry.trim().length > 0);

      if (action.type === 'db.get' && tableApi.get) {
        const options = evaluateRecord(action.options, evalContext);
        lastResult = await tableApi.get({
          ...options,
          keys: withKeys.length > 0 ? withKeys : undefined,
        });
      } else if (action.type === 'db.create' && tableApi.create) {
        const data = evaluateRecord(action.data, evalContext);
        lastResult = await tableApi.create(...withKeys)(data);
      } else if (action.type === 'db.update' && tableApi.update) {
        const id = evaluateMaybeExpression(action.id, evalContext);
        if (typeof id !== 'string' || !id.trim()) continue;
        const data = evaluateRecord(action.data, evalContext);
        lastResult = await tableApi.update(...withKeys)({ id, ...data });
      } else if (action.type === 'db.remove' && tableApi.remove) {
        const id = evaluateMaybeExpression(action.id, evalContext);
        if (typeof id !== 'string' || !id.trim()) continue;
        lastResult = await tableApi.remove(...withKeys)(id);
      }

      if ('assignResultToField' in action && action.assignResultToField) {
        const targetField = evaluateMaybeExpression(
          action.assignResultToField,
          evalContext,
        );
        if (typeof targetField === 'string' && targetField.trim()) {
          params.form.setValue(targetField, lastResult, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: false,
          });
        }
      }
    } catch (error) {
      if (plan.stopOnError ?? true) {
        throw error;
      }
    }
  }
}

export function runFieldOnValueChange(
  params: {
    customData: FieldConfigCustomData | undefined;
    value: unknown;
    path: string[];
    form: UseFormReturn;
    businessBasePath?: string;
  },
) {
  const handler = params.customData?.onValueChange;
  if (!handler) return;

  if (typeof handler === 'function') {
    handler(String(params.value ?? ''), params.path, params.form);
    return;
  }

  if (!isOnValueChangePlan(handler)) return;
  void executePlan(handler, params).catch(() => {
    // Silent by design to avoid blocking form interaction.
  });
}

