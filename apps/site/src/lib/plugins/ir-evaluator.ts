import type { ExpressionDoc } from '@/lib/plugins/types';

export type ExpressionEvalContext = {
  payload?: unknown;
  formValues?: unknown;
  context?: unknown;
  sourceRow?: unknown;
  row?: unknown;
};

export type EvaluateExpressionOptions = {
  maxDepth?: number;
  maxNodes?: number;
  timeoutMs?: number;
};

export class ExpressionEvaluationError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'MAX_DEPTH'
      | 'MAX_NODES'
      | 'TIMEOUT'
      | 'INVALID_NODE'
      | 'UNSUPPORTED_KIND'
      | 'UNSUPPORTED_OP'
      | 'INVALID_REGEX' = 'INVALID_NODE',
  ) {
    super(message);
    this.name = 'ExpressionEvaluationError';
  }
}

function getValueAtPath(input: unknown, path: string[]) {
  return path.reduce<unknown>((acc, segment) => {
    if (!acc || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[segment];
  }, input);
}

function isExpressionObject(
  input: unknown,
): input is Extract<ExpressionDoc, { kind: string }> {
  return (
    !!input &&
    typeof input === 'object' &&
    'kind' in input &&
    typeof (input as { kind: string }).kind === 'string'
  );
}

function asNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizePathArg(pathArg: unknown): string[] {
  if (Array.isArray(pathArg)) {
    return pathArg.map((segment) => String(segment));
  }
  if (typeof pathArg === 'string') {
    return pathArg.split('.').filter(Boolean);
  }
  return [];
}

type WalkState = {
  visitedNodes: number;
  startedAtMs: number;
};

export function evaluateExpression(
  expression: ExpressionDoc,
  context: ExpressionEvalContext,
  options: EvaluateExpressionOptions = {},
): unknown {
  const maxDepth = options.maxDepth ?? 24;
  const maxNodes = options.maxNodes ?? 1_000;
  const timeoutMs = options.timeoutMs ?? 10;
  const state: WalkState = {
    visitedNodes: 0,
    startedAtMs: Date.now(),
  };

  function walk(node: ExpressionDoc, depth: number): unknown {
    if (depth > maxDepth) {
      throw new ExpressionEvaluationError(
        `Expression exceeded max depth (${maxDepth})`,
        'MAX_DEPTH',
      );
    }
    state.visitedNodes += 1;
    if (state.visitedNodes > maxNodes) {
      throw new ExpressionEvaluationError(
        `Expression exceeded max node count (${maxNodes})`,
        'MAX_NODES',
      );
    }
    if (Date.now() - state.startedAtMs > timeoutMs) {
      throw new ExpressionEvaluationError(
        `Expression exceeded timeout (${timeoutMs}ms)`,
        'TIMEOUT',
      );
    }

    if (
      node === null ||
      typeof node === 'string' ||
      typeof node === 'number' ||
      typeof node === 'boolean'
    ) {
      return node;
    }
    if (!isExpressionObject(node)) {
      throw new ExpressionEvaluationError(
        'Invalid expression node',
        'INVALID_NODE',
      );
    }

    if (node.kind === 'ref') {
      switch (node.source) {
        case 'payload':
          return getValueAtPath(context.payload, node.path);
        case 'formValues':
          return getValueAtPath(context.formValues, node.path);
        case 'context':
          return getValueAtPath(context.context, node.path);
        case 'sourceRow':
          return getValueAtPath(context.sourceRow, node.path);
        case 'row':
          return getValueAtPath(context.row, node.path);
        default:
          return undefined;
      }
    }

    if (node.kind === 'array') {
      return node.items.map((entry) => walk(entry, depth + 1));
    }

    if (node.kind === 'object') {
      return Object.fromEntries(
        Object.entries(node.value).map(([key, value]) => [
          key,
          walk(value, depth + 1),
        ]),
      );
    }

    if (node.kind !== 'op') {
      throw new ExpressionEvaluationError(
        `Unsupported expression node kind "${(node as { kind: string }).kind}"`,
        'UNSUPPORTED_KIND',
      );
    }

    const args = node.args.map((arg) => walk(arg, depth + 1));

    switch (node.op) {
      case 'eq':
        return args[0] === args[1];
      case 'neq':
        return args[0] !== args[1];
      case 'gt':
        return asNumber(args[0]) > asNumber(args[1]);
      case 'gte':
        return asNumber(args[0]) >= asNumber(args[1]);
      case 'lt':
        return asNumber(args[0]) < asNumber(args[1]);
      case 'lte':
        return asNumber(args[0]) <= asNumber(args[1]);
      case 'and':
        return args.every(Boolean);
      case 'or':
        return args.some(Boolean);
      case 'not':
        return !args[0];
      case 'add':
        return args.reduce<number>((sum, value) => sum + asNumber(value), 0);
      case 'sub':
        return asNumber(args[0]) - asNumber(args[1]);
      case 'mul':
        return args.reduce<number>(
          (product, value) => product * asNumber(value),
          1,
        );
      case 'div':
        return asNumber(args[0]) / Math.max(asNumber(args[1]), 1);
      case 'coalesce':
        return args.find((value) => value !== null && value !== undefined);
      case 'concat':
        return args.map((value) => String(value ?? '')).join('');
      case 'sum':
        return args.reduce<number>((sum, value) => sum + asNumber(value), 0);
      case 'if':
        return args[0] ? args[1] : args[2];
      case 'changed': {
        const path = normalizePathArg(args[0]);
        if (path.length === 0) {
          return args[0] !== args[1];
        }
        return (
          getValueAtPath(context.sourceRow, path) !==
          getValueAtPath(context.row, path)
        );
      }
      case 'was': {
        const path = normalizePathArg(args[0]);
        return path.length
          ? getValueAtPath(context.sourceRow, path)
          : context.sourceRow;
      }
      case 'now': {
        const path = normalizePathArg(args[0]);
        return path.length ? getValueAtPath(context.row, path) : context.row;
      }
      case 'exists': {
        const path = normalizePathArg(args[0]);
        if (!path.length) {
          return args[0] !== null && args[0] !== undefined;
        }
        const value =
          getValueAtPath(context.row, path) ??
          getValueAtPath(context.sourceRow, path) ??
          getValueAtPath(context.payload, path);
        return value !== null && value !== undefined;
      }
      case 'match': {
        const value = String(args[0] ?? '');
        const pattern = String(args[1] ?? '');
        try {
          return new RegExp(pattern).test(value);
        } catch {
          throw new ExpressionEvaluationError(
            `Invalid regex pattern "${pattern}"`,
            'INVALID_REGEX',
          );
        }
      }
      default:
        throw new ExpressionEvaluationError(
          `Unsupported expression op "${node.op}"`,
          'UNSUPPORTED_OP',
        );
    }
  }

  return walk(expression, 0);
}

export function isLikelyExpressionDoc(value: unknown): value is ExpressionDoc {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true;
  }
  return isExpressionObject(value);
}
