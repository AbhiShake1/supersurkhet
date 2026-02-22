import { describe, expect, it } from 'vitest';
import { evaluateExpression } from '@/lib/plugins/ir-evaluator';
import type { DeriveIR } from '@/lib/plugins/types';
import {
  compileVisualDerivationsToDeriveIr,
  type VisualDerivation,
} from './derivation-ir-compiler';

function applyCompiledDerivations(
  derivations: readonly DeriveIR[],
  expressionContext: {
    payload?: unknown;
    formValues?: unknown;
    context?: unknown;
    sourceRow?: unknown;
    row?: unknown;
  },
) {
  const derived: Record<string, unknown> = {};

  for (const derivation of derivations) {
    const evaluated = evaluateExpression(
      derivation.expression,
      expressionContext,
    );

    if (derivation.target === 'value') {
      derived.value = evaluated;
      continue;
    }

    if (!derived[derivation.target]) {
      derived[derivation.target] = {};
    }

    const targetRecord = derived[derivation.target] as Record<string, unknown>;

    if (derivation.key) {
      targetRecord[derivation.key] = evaluated;
      continue;
    }

    if (evaluated && typeof evaluated === 'object') {
      Object.assign(targetRecord, evaluated);
    }
  }

  return derived;
}

describe('derivation ir compiler', () => {
  it('compiles value and override branches with locked operators and typed refs', () => {
    const derivations: VisualDerivation[] = [
      {
        target: { path: ['value'] },
        expression: {
          kind: 'op',
          op: 'if',
          args: [
            {
              kind: 'op',
              op: 'eq',
              args: [
                { kind: 'ref', source: 'sourceRow', path: ['category'] },
                { kind: 'literal', value: 'vip' },
              ],
            },
            {
              kind: 'op',
              op: 'sum',
              args: [
                { kind: 'ref', source: 'row', path: ['basePrice'] },
                { kind: 'literal', value: 20 },
              ],
            },
            { kind: 'literal', value: 0 },
          ],
        },
      },
      {
        target: { path: ['inputProps', 'placeholder'] },
        expression: {
          kind: 'op',
          op: 'concat',
          args: [
            { kind: 'literal', value: 'Total for ' },
            { kind: 'ref', source: 'formValues', path: ['customerName'] },
          ],
        },
      },
      {
        target: { path: ['customData', 'disableWhenValueIn'] },
        expression: {
          kind: 'array',
          items: [
            { kind: 'literal', value: 'archived' },
            { kind: 'ref', source: 'context', path: ['hook'] },
          ],
        },
      },
    ];

    const result = compileVisualDerivationsToDeriveIr(derivations);

    expect(result.diagnostics).toEqual([]);
    expect(result.derivations).toEqual([
      {
        target: 'value',
        expression: {
          kind: 'op',
          op: 'if',
          args: [
            {
              kind: 'op',
              op: 'eq',
              args: [
                { kind: 'ref', source: 'sourceRow', path: ['category'] },
                'vip',
              ],
            },
            {
              kind: 'op',
              op: 'sum',
              args: [{ kind: 'ref', source: 'row', path: ['basePrice'] }, 20],
            },
            0,
          ],
        },
      },
      {
        target: 'inputProps',
        key: 'placeholder',
        expression: {
          kind: 'op',
          op: 'concat',
          args: [
            'Total for ',
            { kind: 'ref', source: 'formValues', path: ['customerName'] },
          ],
        },
      },
      {
        target: 'customData',
        key: 'disableWhenValueIn',
        expression: {
          kind: 'array',
          items: [
            'archived',
            { kind: 'ref', source: 'context', path: ['hook'] },
          ],
        },
      },
    ]);

    expect(
      applyCompiledDerivations(result.derivations, {
        formValues: { customerName: 'Anu', item: { basePrice: 100 } },
        sourceRow: { category: 'vip' },
        context: { hook: 'beforeUpdate' },
        row: { basePrice: 100 },
      }),
    ).toEqual({
      value: 120,
      inputProps: {
        placeholder: 'Total for Anu',
      },
      customData: {
        disableWhenValueIn: ['archived', 'beforeUpdate'],
      },
    });
  });

  it('supports direct target shape and deterministic id ordering', () => {
    const derivations: VisualDerivation[] = [
      {
        id: 'derivation_z',
        target: { branch: 'customData', key: 'order' },
        expression: { kind: 'literal', value: 2 },
      },
      {
        id: 'derivation_a',
        target: { branch: 'inputProps', key: 'step' },
        expression: { kind: 'literal', value: 1 },
      },
    ];

    const result = compileVisualDerivationsToDeriveIr(derivations);

    expect(result.diagnostics).toEqual([]);
    expect(result.derivations).toEqual([
      {
        target: 'inputProps',
        key: 'step',
        expression: 1,
      },
      {
        target: 'customData',
        key: 'order',
        expression: 2,
      },
    ]);
  });

  it('reports diagnostics for invalid target path and unsupported operators', () => {
    const derivations: VisualDerivation[] = [
      {
        target: { path: ['inputProps'] },
        expression: { kind: 'literal', value: 'missing-key' },
      },
      {
        target: { branch: 'value' },
        expression: {
          kind: 'op',
          op: 'add',
          args: [
            { kind: 'literal', value: 1 },
            { kind: 'literal', value: 2 },
          ],
        },
      },
    ];

    const result = compileVisualDerivationsToDeriveIr(derivations);

    expect(result.derivations).toEqual([]);
    expect(result.diagnostics).toEqual([
      {
        code: 'invalid-target-path',
        message:
          'Target path must be ["value"] or ["inputProps", key] or ["customData", key]',
        path: ['derivations', '0', 'target', 'path'],
      },
      {
        code: 'unsupported-expression-operator',
        message: 'Unsupported expression operator "add"',
        path: ['derivations', '1', 'expression', 'op'],
      },
    ]);
  });
});
