import type { ExpressionDoc } from '@supersurkhet/sdk';
import { describe, expect, it } from 'vitest';
import {
  buildExpressionRowAst,
  buildExpressionRowsAst,
  type ExpressionRow,
  type ExpressionRowOperator,
} from './expression-row-builder';

function expectOpNode(expression: ExpressionDoc | null) {
  expect(expression).not.toBeNull();
  expect(typeof expression).toBe('object');
  expect((expression as { kind?: string }).kind).toBe('op');
}

describe('expression-row-builder', () => {
  it('builds valid op nodes for every supported operator', () => {
    const cases: Array<{
      operator: ExpressionRowOperator;
      operands: ExpressionRow['operands'];
    }> = [
      {
        operator: 'eq',
        operands: [
          { kind: 'fieldRef', path: ['status'] },
          { kind: 'constant', value: 'draft' },
        ],
      },
      {
        operator: 'neq',
        operands: [
          { kind: 'fieldRef', path: ['status'] },
          { kind: 'constant', value: 'published' },
        ],
      },
      {
        operator: 'gt',
        operands: [
          { kind: 'rowRef', path: ['price'] },
          { kind: 'constant', value: 100 },
        ],
      },
      {
        operator: 'gte',
        operands: [
          { kind: 'rowRef', path: ['price'] },
          { kind: 'constant', value: 100 },
        ],
      },
      {
        operator: 'lt',
        operands: [
          { kind: 'sourceRowRef', path: ['stock'] },
          { kind: 'constant', value: 5 },
        ],
      },
      {
        operator: 'lte',
        operands: [
          { kind: 'sourceRowRef', path: ['stock'] },
          { kind: 'constant', value: 10 },
        ],
      },
      {
        operator: 'and',
        operands: [
          { kind: 'constant', value: true },
          { kind: 'constant', value: false },
        ],
      },
      {
        operator: 'or',
        operands: [
          { kind: 'constant', value: true },
          { kind: 'constant', value: false },
        ],
      },
      {
        operator: 'not',
        operands: [{ kind: 'constant', value: true }],
      },
      {
        operator: 'if',
        operands: [
          { kind: 'constant', value: true },
          { kind: 'constant', value: 'yes' },
          { kind: 'constant', value: 'no' },
        ],
      },
      {
        operator: 'coalesce',
        operands: [
          { kind: 'constant', value: null },
          { kind: 'constant', value: 'fallback' },
        ],
      },
      {
        operator: 'concat',
        operands: [
          { kind: 'constant', value: 'hello ' },
          { kind: 'contextRef', path: ['userName'] },
        ],
      },
      {
        operator: 'sum',
        operands: [
          { kind: 'constant', value: 10 },
          { kind: 'constant', value: 20 },
        ],
      },
    ];

    for (const entry of cases) {
      const result = buildExpressionRowAst({
        operator: entry.operator,
        operands: entry.operands,
      });

      expect(result.diagnostics).toEqual([]);
      expectOpNode(result.expression);
      expect((result.expression as { op: string }).op).toBe(entry.operator);
    }
  });

  it('builds nested expressions and typed operand refs for payload/sourceRow/row/context', () => {
    const row: ExpressionRow = {
      operator: 'if',
      operands: [
        {
          kind: 'expression',
          expression: {
            operator: 'eq',
            operands: [
              { kind: 'sourceRowRef', path: ['tier'] },
              { kind: 'constant', value: 'vip' },
            ],
          },
        },
        {
          kind: 'expression',
          expression: {
            operator: 'sum',
            operands: [
              { kind: 'rowRef', path: ['basePrice'] },
              { kind: 'constant', value: 20 },
            ],
          },
        },
        {
          kind: 'expression',
          expression: {
            operator: 'concat',
            operands: [
              { kind: 'constant', value: 'for ' },
              { kind: 'fieldRef', path: ['customerName'] },
              { kind: 'constant', value: ' by ' },
              { kind: 'contextRef', path: ['hook'] },
            ],
          },
        },
      ],
    };

    const result = buildExpressionRowAst(row);

    expect(result.diagnostics).toEqual([]);
    expect(result.expression).toEqual({
      kind: 'op',
      op: 'if',
      args: [
        {
          kind: 'op',
          op: 'eq',
          args: [{ kind: 'ref', source: 'sourceRow', path: ['tier'] }, 'vip'],
        },
        {
          kind: 'op',
          op: 'sum',
          args: [{ kind: 'ref', source: 'row', path: ['basePrice'] }, 20],
        },
        {
          kind: 'op',
          op: 'concat',
          args: [
            'for ',
            { kind: 'ref', source: 'payload', path: ['customerName'] },
            ' by ',
            { kind: 'ref', source: 'context', path: ['hook'] },
          ],
        },
      ],
    });
  });

  it('returns diagnostics for invalid operator arity and invalid operand path', () => {
    const rows: ExpressionRow[] = [
      {
        operator: 'not',
        operands: [
          { kind: 'constant', value: true },
          { kind: 'constant', value: false },
        ],
      },
      {
        operator: 'eq',
        operands: [
          { kind: 'fieldRef', path: [] },
          { kind: 'constant', value: 'x' },
        ],
      },
    ];

    const result = buildExpressionRowsAst(rows);

    expect(result.expressions).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        code: 'invalid-operand-count',
        message: 'Operator "not" expects exactly 1 operand(s), received 2',
        path: ['rows', '0', 'operands'],
      },
      {
        code: 'invalid-operand-path',
        message: 'Reference operand path must include at least one segment',
        path: ['rows', '1', 'operands', '0', 'path'],
      },
    ]);
  });
});
