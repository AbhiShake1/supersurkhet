import type {
  ExpressionDoc,
  ExpressionOpDoc,
  JsonPrimitive,
} from 'supersurkhet-sdk';

export type ExpressionRowOperator =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'and'
  | 'or'
  | 'not'
  | 'if'
  | 'coalesce'
  | 'concat'
  | 'sum';

export type ExpressionRowOperand =
  | {
      kind: 'constant';
      value: JsonPrimitive;
    }
  | {
      kind: 'fieldRef';
      path: string[];
    }
  | {
      kind: 'sourceRowRef';
      path: string[];
    }
  | {
      kind: 'rowRef';
      path: string[];
    }
  | {
      kind: 'contextRef';
      path: string[];
    }
  | {
      kind: 'expression';
      expression: ExpressionRow;
    };

export type ExpressionRow = {
  operator: ExpressionRowOperator;
  operands: ExpressionRowOperand[];
};

export type ExpressionRowBuilderDiagnostic = {
  code:
    | 'unsupported-operator'
    | 'invalid-operand-count'
    | 'invalid-operand-path';
  message: string;
  path: string[];
};

export type BuildExpressionRowResult = {
  expression: ExpressionDoc | null;
  diagnostics: ExpressionRowBuilderDiagnostic[];
};

export type BuildExpressionRowsResult = {
  expressions: ExpressionDoc[];
  diagnostics: ExpressionRowBuilderDiagnostic[];
};

type OperatorRule = {
  min: number;
  max?: number;
};

const OPERATOR_RULES: Record<ExpressionRowOperator, OperatorRule> = {
  eq: { min: 2, max: 2 },
  neq: { min: 2, max: 2 },
  gt: { min: 2, max: 2 },
  gte: { min: 2, max: 2 },
  lt: { min: 2, max: 2 },
  lte: { min: 2, max: 2 },
  and: { min: 2 },
  or: { min: 2 },
  not: { min: 1, max: 1 },
  if: { min: 3, max: 3 },
  coalesce: { min: 1 },
  concat: { min: 1 },
  sum: { min: 1 },
};

export function buildExpressionRowAst(
  row: ExpressionRow,
): BuildExpressionRowResult {
  const diagnostics: ExpressionRowBuilderDiagnostic[] = [];
  const expression = compileRow(row, diagnostics, ['row']);

  return {
    expression,
    diagnostics,
  };
}

export function buildExpressionRowsAst(
  rows: readonly ExpressionRow[],
): BuildExpressionRowsResult {
  const diagnostics: ExpressionRowBuilderDiagnostic[] = [];
  const expressions: ExpressionDoc[] = [];

  for (const [index, row] of rows.entries()) {
    const expression = compileRow(row, diagnostics, ['rows', String(index)]);
    if (expression !== null) {
      expressions.push(expression);
    }
  }

  return {
    expressions,
    diagnostics,
  };
}

function compileRow(
  row: ExpressionRow,
  diagnostics: ExpressionRowBuilderDiagnostic[],
  path: string[],
): ExpressionDoc | null {
  const rule = OPERATOR_RULES[row.operator];
  if (!rule) {
    diagnostics.push({
      code: 'unsupported-operator',
      message: `Unsupported operator "${String(row.operator)}"`,
      path: [...path, 'operator'],
    });
    return null;
  }

  if (!isOperandCountValid(row.operands.length, rule)) {
    diagnostics.push({
      code: 'invalid-operand-count',
      message: formatOperandCountMessage(
        row.operator,
        row.operands.length,
        rule,
      ),
      path: [...path, 'operands'],
    });
    return null;
  }

  const args: ExpressionDoc[] = [];
  for (const [index, operand] of row.operands.entries()) {
    const arg = compileOperand(operand, diagnostics, [
      ...path,
      'operands',
      String(index),
    ]);

    if (arg === undefined) {
      return null;
    }

    args.push(arg);
  }

  return {
    kind: 'op',
    op: row.operator as ExpressionOpDoc['op'],
    args,
  };
}

function compileOperand(
  operand: ExpressionRowOperand,
  diagnostics: ExpressionRowBuilderDiagnostic[],
  path: string[],
): ExpressionDoc | undefined {
  if (operand.kind === 'constant') {
    return operand.value;
  }

  if (operand.kind === 'expression') {
    return (
      compileRow(operand.expression, diagnostics, [...path, 'expression']) ??
      undefined
    );
  }

  const source =
    operand.kind === 'fieldRef'
      ? 'payload'
      : operand.kind === 'sourceRowRef'
        ? 'sourceRow'
        : operand.kind === 'rowRef'
          ? 'row'
          : 'context';

  if (operand.path.length === 0) {
    diagnostics.push({
      code: 'invalid-operand-path',
      message: 'Reference operand path must include at least one segment',
      path: [...path, 'path'],
    });
    return undefined;
  }

  return {
    kind: 'ref',
    source,
    path: operand.path,
  };
}

function isOperandCountValid(count: number, rule: OperatorRule) {
  return count >= rule.min && (rule.max === undefined || count <= rule.max);
}

function formatOperandCountMessage(
  operator: ExpressionRowOperator,
  count: number,
  rule: OperatorRule,
) {
  if (rule.max !== undefined && rule.max === rule.min) {
    return `Operator "${operator}" expects exactly ${rule.min} operand(s), received ${count}`;
  }

  if (rule.max !== undefined) {
    return `Operator "${operator}" expects ${rule.min}-${rule.max} operand(s), received ${count}`;
  }

  return `Operator "${operator}" expects at least ${rule.min} operand(s), received ${count}`;
}

export type ExpressionRowBuilderProps = {
  rows: readonly ExpressionRow[];
};

export function ExpressionRowBuilder({ rows }: ExpressionRowBuilderProps) {
  const result = buildExpressionRowsAst(rows);

  return (
    <section aria-label="Expression row builder">
      <h2>Expression Row Builder</h2>
      <p>Rows: {rows.length}</p>
      <p>Valid expressions: {result.expressions.length}</p>
      {result.diagnostics.length > 0 ? (
        <ul>
          {result.diagnostics.map((diagnostic) => (
            <li key={diagnostic.path.join('.') + diagnostic.code}>
              {diagnostic.code}: {diagnostic.message}
            </li>
          ))}
        </ul>
      ) : (
        <p>No validation errors</p>
      )}
    </section>
  );
}
