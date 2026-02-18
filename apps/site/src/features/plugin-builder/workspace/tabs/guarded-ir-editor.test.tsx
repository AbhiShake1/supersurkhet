import type { SchemaDoc } from 'supersurkhet-sdk';
import { describe, expect, it } from 'vitest';
import {
  applyGuardedIrDraftText,
  createGuardedIrEditorState,
  switchGuardedIrEditorMode,
} from './guarded-ir-editor';

const BASE_SCHEMA_DOCS: SchemaDoc[] = [
  {
    schemaId: 'customer',
    title: 'Customer',
    fields: [
      {
        key: 'name',
        type: 'string',
      },
      {
        key: 'age',
        type: 'number',
      },
    ],
  },
];

describe('GuardedIrEditor', () => {
  it('switches between visual and IR views with round-trip safety', () => {
    const initial = createGuardedIrEditorState({
      schemaDocs: BASE_SCHEMA_DOCS,
    });

    expect(initial.mode).toBe('visual');
    expect(initial.canSave).toBe(true);

    const irMode = switchGuardedIrEditorMode(initial, 'ir');
    expect(irMode.mode).toBe('ir');
    expect(irMode.canSave).toBe(true);

    const visualMode = switchGuardedIrEditorMode(irMode, 'visual');
    expect(visualMode.mode).toBe('visual');
    expect(visualMode.canSave).toBe(true);
    expect(visualMode.schemaDocs).toEqual(BASE_SCHEMA_DOCS);
  });

  it('flags unsafe IR patterns before save', () => {
    const initial = switchGuardedIrEditorMode(
      createGuardedIrEditorState({ schemaDocs: BASE_SCHEMA_DOCS }),
      'ir',
    );

    const withUnsafePattern = applyGuardedIrDraftText(
      initial,
      JSON.stringify(
        [
          {
            schemaId: 'customer',
            fields: [
              { key: 'name', type: 'string' },
              { key: 'age', type: 'number' },
            ],
            description: 'javascript:alert(1)',
          },
        ],
        null,
        2,
      ),
    );

    expect(withUnsafePattern.canSave).toBe(false);
    expect(
      withUnsafePattern.diagnostics.some(
        (diagnostic) => diagnostic.code === 'unsafe-ir-pattern',
      ),
    ).toBe(true);
  });

  it('enters readonly lockout while parse errors remain unresolved and recovers after valid IR', () => {
    const initial = switchGuardedIrEditorMode(
      createGuardedIrEditorState({ schemaDocs: BASE_SCHEMA_DOCS }),
      'ir',
    );

    const broken = applyGuardedIrDraftText(initial, '{ broken json');
    expect(broken.isReadOnly).toBe(true);
    expect(broken.canSave).toBe(false);
    expect(broken.mode).toBe('ir');

    const attemptedVisualSwitch = switchGuardedIrEditorMode(broken, 'visual');
    expect(attemptedVisualSwitch.mode).toBe('ir');

    const recovered = applyGuardedIrDraftText(
      broken,
      JSON.stringify(BASE_SCHEMA_DOCS, null, 2),
    );

    expect(recovered.isReadOnly).toBe(false);
    expect(recovered.canSave).toBe(true);
    expect(recovered.diagnostics).toEqual([]);

    const visualAfterRecovery = switchGuardedIrEditorMode(recovered, 'visual');
    expect(visualAfterRecovery.mode).toBe('visual');
    expect(visualAfterRecovery.canSave).toBe(true);
  });
});
