import type {
  DeriveIR,
  ExpressionDoc,
  ExpressionOpDoc,
  ExpressionRefDoc,
  JsonPrimitive,
} from '@supersurkhet/sdk';

const LOCKED_EXPRESSION_OPERATORS = new Set<ExpressionOpDoc['op']>([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'and',
  'or',
  'not',
  'if',
  'coalesce',
  'concat',
  'sum',
]);

const LOCKED_REFERENCE_SOURCES = new Set<ExpressionRefDoc['source']>([
  'payload',
  'formValues',
  'context',
  'sourceRow',
  'row',
]);

export type VisualExpression =
  | JsonPrimitive
  | {
      kind: 'literal';
      value: JsonPrimitive;
    }
  | {
      kind: 'ref';
      source: ExpressionRefDoc['source'];
      path: string[];
    }
  | {
      kind: 'array';
      items: VisualExpression[];
    }
  | {
      kind: 'object';
      value: Record<string, VisualExpression>;
    }
  | {
      kind: 'op';
      op: ExpressionOpDoc['op'];
      args: VisualExpression[];
    };

export type VisualDerivationTarget =
  | {
      branch: 'value';
      key?: never;
    }
  | {
      branch: 'inputProps' | 'customData';
      key: string;
    }
  | {
      path:
        | ['value']
        | ['inputProps', string]
        | ['customData', string]
        | string[];
    };

export type VisualDerivation = {
  id?: string;
  target: VisualDerivationTarget;
  expression: VisualExpression;
};

export type DerivationIrCompilerDiagnostic = {
  code:
    | 'invalid-target-path'
    | 'unsupported-expression-operator'
    | 'unsupported-reference-source'
    | 'invalid-expression';
  message: string;
  path: string[];
};

export type CompileDerivationIrResult = {
  derivations: DeriveIR[];
  diagnostics: DerivationIrCompilerDiagnostic[];
};

export function compileVisualDerivationsToDeriveIr(
  derivations: readonly VisualDerivation[],
): CompileDerivationIrResult {
  const diagnostics: DerivationIrCompilerDiagnostic[] = [];
  const compiled: DeriveIR[] = [];
  const sortable = derivations.map((derivation, index) => ({
    derivation,
    index,
  }));
  const shouldSortById = sortable.every(
    ({ derivation }) =>
      typeof derivation.id === 'string' && derivation.id.length > 0,
  );
  const ordered = shouldSortById
    ? [...sortable].sort((left, right) =>
        (left.derivation.id as string).localeCompare(
          right.derivation.id as string,
        ),
      )
    : sortable;

  for (const { derivation, index } of ordered) {
    const target = compileTarget(derivation.target, diagnostics, [
      'derivations',
      String(index),
      'target',
    ]);
    const expression = compileExpression(derivation.expression, diagnostics, [
      'derivations',
      String(index),
      'expression',
    ]);

    if (!target || expression === undefined) {
      continue;
    }

    compiled.push({
      target: target.target,
      key: target.key,
      expression,
    });
  }

  return {
    derivations: compiled,
    diagnostics,
  };
}

function compileTarget(
  target: VisualDerivationTarget,
  diagnostics: DerivationIrCompilerDiagnostic[],
  path: string[],
): Pick<DeriveIR, 'target' | 'key'> | undefined {
  if ('branch' in target) {
    if (target.branch === 'value') {
      return { target: 'value' };
    }

    if (target.key.trim().length === 0) {
      diagnostics.push({
        code: 'invalid-target-path',
        message:
          'Target path must be ["value"] or ["inputProps", key] or ["customData", key]',
        path: [...path, 'key'],
      });
      return undefined;
    }

    return {
      target: target.branch,
      key: target.key,
    };
  }

  const rawPath = target.path;
  if (!Array.isArray(rawPath) || rawPath.length === 0) {
    diagnostics.push({
      code: 'invalid-target-path',
      message:
        'Target path must be ["value"] or ["inputProps", key] or ["customData", key]',
      path: [...path, 'path'],
    });
    return undefined;
  }

  const [branch, key] = rawPath;
  if (branch === 'value' && rawPath.length === 1) {
    return { target: 'value' };
  }

  if (
    (branch === 'inputProps' || branch === 'customData') &&
    rawPath.length === 2 &&
    typeof key === 'string' &&
    key.trim().length > 0
  ) {
    return {
      target: branch,
      key,
    };
  }

  diagnostics.push({
    code: 'invalid-target-path',
    message:
      'Target path must be ["value"] or ["inputProps", key] or ["customData", key]',
    path: [...path, 'path'],
  });
  return undefined;
}

function compileExpression(
  expression: VisualExpression,
  diagnostics: DerivationIrCompilerDiagnostic[],
  path: string[],
): ExpressionDoc | undefined {
  if (
    expression === null ||
    typeof expression === 'string' ||
    typeof expression === 'number' ||
    typeof expression === 'boolean'
  ) {
    return expression;
  }

  if (
    !expression ||
    typeof expression !== 'object' ||
    !('kind' in expression)
  ) {
    diagnostics.push({
      code: 'invalid-expression',
      message: 'Expression node must be a literal, ref, op, array, or object',
      path,
    });
    return undefined;
  }

  if (expression.kind === 'literal') {
    return expression.value;
  }

  if (expression.kind === 'ref') {
    if (!LOCKED_REFERENCE_SOURCES.has(expression.source)) {
      diagnostics.push({
        code: 'unsupported-reference-source',
        message: `Unsupported expression reference source "${expression.source}"`,
        path: [...path, 'source'],
      });
      return undefined;
    }

    return {
      kind: 'ref',
      source: expression.source,
      path: expression.path,
    };
  }

  if (expression.kind === 'array') {
    const items: ExpressionDoc[] = [];

    for (const [index, entry] of expression.items.entries()) {
      const compiled = compileExpression(entry, diagnostics, [
        ...path,
        'items',
        String(index),
      ]);

      if (compiled === undefined) {
        return undefined;
      }
      items.push(compiled);
    }

    return {
      kind: 'array',
      items,
    };
  }

  if (expression.kind === 'object') {
    const value: Record<string, ExpressionDoc> = {};

    for (const [key, entry] of Object.entries(expression.value)) {
      const compiled = compileExpression(entry, diagnostics, [
        ...path,
        'value',
        key,
      ]);

      if (compiled === undefined) {
        return undefined;
      }
      value[key] = compiled;
    }

    return {
      kind: 'object',
      value,
    };
  }

  if (expression.kind === 'op') {
    if (!LOCKED_EXPRESSION_OPERATORS.has(expression.op)) {
      diagnostics.push({
        code: 'unsupported-expression-operator',
        message: `Unsupported expression operator "${expression.op}"`,
        path: [...path, 'op'],
      });
      return undefined;
    }

    const args: ExpressionDoc[] = [];
    for (const [index, arg] of expression.args.entries()) {
      const compiledArg = compileExpression(arg, diagnostics, [
        ...path,
        'args',
        String(index),
      ]);
      if (compiledArg === undefined) {
        return undefined;
      }
      args.push(compiledArg);
    }

    return {
      kind: 'op',
      op: expression.op,
      args,
    };
  }

  diagnostics.push({
    code: 'invalid-expression',
    message: 'Expression node must be a literal, ref, op, array, or object',
    path,
  });
  return undefined;
}
