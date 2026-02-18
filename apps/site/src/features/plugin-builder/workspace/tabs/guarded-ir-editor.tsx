import type { ChangeEvent } from 'react';
import type { SchemaDoc } from 'supersurkhet-sdk';
import {
  mapSchemaDocsToWorkspace,
  mapWorkspaceSchemasToSchemaDocs,
} from '../../domain/ir/schema-ir-mapper';
import {
  type PluginBuildDiagnostic,
  sortPluginBuildDiagnostics,
} from '../../domain/validation/diagnostics-contract';

export type GuardedIrEditorMode = 'visual' | 'ir';

export type GuardedIrEditorState = {
  mode: GuardedIrEditorMode;
  schemaDocs: SchemaDoc[];
  irText: string;
  diagnostics: PluginBuildDiagnostic[];
  isReadOnly: boolean;
  canSave: boolean;
};

export type CreateGuardedIrEditorStateInput = {
  schemaDocs: readonly SchemaDoc[];
  initialMode?: GuardedIrEditorMode;
};

export type GuardedIrEditorProps = {
  state: GuardedIrEditorState;
  onModeChange: (mode: GuardedIrEditorMode) => void;
  onIrTextChange: (nextText: string) => void;
};

const UNSAFE_KEY_SEGMENTS = new Set(['__proto__', 'prototype', 'constructor']);
const UNSAFE_STRING_PATTERNS = [/javascript:/i, /<script/i];

export function createGuardedIrEditorState({
  schemaDocs,
  initialMode = 'visual',
}: CreateGuardedIrEditorStateInput): GuardedIrEditorState {
  const nextSchemaDocs = cloneSchemaDocs(schemaDocs);
  const lintDiagnostics = lintSchemaDocs(nextSchemaDocs);

  return {
    mode: initialMode,
    schemaDocs: nextSchemaDocs,
    irText: formatIrText(nextSchemaDocs),
    diagnostics: lintDiagnostics,
    isReadOnly: false,
    canSave: !hasErrorDiagnostics(lintDiagnostics),
  };
}

export function switchGuardedIrEditorMode(
  state: GuardedIrEditorState,
  nextMode: GuardedIrEditorMode,
): GuardedIrEditorState {
  if (state.mode === nextMode) {
    return state;
  }

  if (nextMode === 'visual' && state.isReadOnly) {
    return state;
  }

  if (nextMode === 'ir') {
    return {
      ...state,
      mode: 'ir',
      irText: formatIrText(state.schemaDocs),
    };
  }

  return {
    ...state,
    mode: 'visual',
  };
}

export function applyGuardedIrDraftText(
  state: GuardedIrEditorState,
  irText: string,
): GuardedIrEditorState {
  const parseResult = parseSchemaDocsIr(irText);
  if (!parseResult.ok) {
    return {
      ...state,
      mode: 'ir',
      irText,
      diagnostics: [parseResult.diagnostic],
      isReadOnly: true,
      canSave: false,
    };
  }

  const schemaDocs = parseResult.schemaDocs;
  const diagnostics = lintSchemaDocs(schemaDocs);

  return {
    ...state,
    mode: 'ir',
    schemaDocs,
    irText,
    diagnostics,
    isReadOnly: false,
    canSave: !hasErrorDiagnostics(diagnostics),
  };
}

export function GuardedIrEditor({
  state,
  onModeChange,
  onIrTextChange,
}: GuardedIrEditorProps) {
  return (
    <section aria-label="Guarded IR editor">
      <h2>Guarded IR Editor</h2>
      <div>
        <button
          type="button"
          onClick={() => onModeChange('visual')}
          disabled={state.mode === 'visual' || state.isReadOnly}
        >
          Visual
        </button>
        <button
          type="button"
          onClick={() => onModeChange('ir')}
          disabled={state.mode === 'ir'}
        >
          IR
        </button>
      </div>

      {state.mode === 'visual' ? (
        <pre>{formatIrText(state.schemaDocs)}</pre>
      ) : (
        <textarea
          aria-label="IR JSON"
          value={state.irText}
          readOnly={state.isReadOnly}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
            onIrTextChange(event.target.value);
          }}
        />
      )}

      {state.diagnostics.length > 0 ? (
        <ul aria-label="Guarded IR diagnostics">
          {state.diagnostics.map((diagnostic) => (
            <li
              key={`${diagnostic.code}:${diagnostic.path.join('.')}:${diagnostic.message}`}
            >
              {diagnostic.severity}: {diagnostic.code} - {diagnostic.message}
            </li>
          ))}
        </ul>
      ) : (
        <p>No diagnostics</p>
      )}
    </section>
  );
}

function parseSchemaDocsIr(irText: string):
  | {
      ok: true;
      schemaDocs: SchemaDoc[];
    }
  | {
      ok: false;
      diagnostic: PluginBuildDiagnostic;
    } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(irText);
  } catch (error) {
    return {
      ok: false,
      diagnostic: {
        code: 'invalid-ir-json',
        severity: 'error',
        path: ['irText'],
        message:
          error instanceof Error
            ? error.message
            : 'Unable to parse IR JSON text',
      },
    };
  }

  if (Array.isArray(parsed)) {
    return {
      ok: true,
      schemaDocs: parsed as SchemaDoc[],
    };
  }

  if (isRecord(parsed) && Array.isArray(parsed.schemaDocs)) {
    return {
      ok: true,
      schemaDocs: parsed.schemaDocs as SchemaDoc[],
    };
  }

  return {
    ok: false,
    diagnostic: {
      code: 'invalid-ir-root',
      severity: 'error',
      path: ['irText'],
      message:
        'IR JSON must be an array of schema docs or an object with schemaDocs.',
    },
  };
}

function lintSchemaDocs(
  schemaDocs: readonly SchemaDoc[],
): PluginBuildDiagnostic[] {
  const diagnostics: PluginBuildDiagnostic[] = [];

  diagnostics.push(...collectUnsafeDiagnostics(schemaDocs, ['schemaDocs']));

  const toWorkspace = mapSchemaDocsToWorkspace(schemaDocs);
  diagnostics.push(
    ...toWorkspace.diagnostics.map((diagnostic) => ({
      code: `schema-ir-${diagnostic.code}`,
      severity: 'error' as const,
      path: diagnostic.path,
      message: diagnostic.message,
      fixHint: 'Remove unsupported nodes before saving IR edits.',
    })),
  );

  const toSchema = mapWorkspaceSchemasToSchemaDocs(
    toWorkspace.workspaceSchemas,
  );
  diagnostics.push(
    ...toSchema.diagnostics.map((diagnostic) => ({
      code: `schema-ir-${diagnostic.code}`,
      severity: 'error' as const,
      path: diagnostic.path,
      message: diagnostic.message,
      fixHint: 'Remove unsupported nodes before saving IR edits.',
    })),
  );

  if (stableStringify(schemaDocs) !== stableStringify(toSchema.schemaDocs)) {
    diagnostics.push({
      code: 'ir-roundtrip-mismatch',
      severity: 'error',
      path: ['schemaDocs'],
      message:
        'IR cannot round-trip safely between visual and IR views without data loss.',
      fixHint: 'Resolve unsupported or non-deterministic fields before saving.',
    });
  }

  return sortPluginBuildDiagnostics(diagnostics);
}

function collectUnsafeDiagnostics(
  value: unknown,
  path: string[],
): PluginBuildDiagnostic[] {
  const diagnostics: PluginBuildDiagnostic[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      diagnostics.push(
        ...collectUnsafeDiagnostics(item, [...path, String(index)]),
      );
    });
    return diagnostics;
  }

  if (!isRecord(value)) {
    if (typeof value === 'string' && hasUnsafeStringPattern(value)) {
      diagnostics.push({
        code: 'unsafe-ir-pattern',
        severity: 'error',
        path,
        message: 'IR contains an unsafe string pattern.',
        fixHint: 'Remove script-like or javascript: values.',
      });
    }
    return diagnostics;
  }

  for (const [key, entry] of Object.entries(value)) {
    const keyPath = [...path, key];

    if (UNSAFE_KEY_SEGMENTS.has(key)) {
      diagnostics.push({
        code: 'unsafe-ir-pattern',
        severity: 'error',
        path: keyPath,
        message: `IR contains unsafe key segment "${key}".`,
        fixHint: 'Use safe object keys only.',
      });
    }

    diagnostics.push(...collectUnsafeDiagnostics(entry, keyPath));
  }

  return diagnostics;
}

function hasUnsafeStringPattern(value: string): boolean {
  return UNSAFE_STRING_PATTERNS.some((pattern) => pattern.test(value));
}

function hasErrorDiagnostics(
  diagnostics: readonly PluginBuildDiagnostic[],
): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error');
}

function formatIrText(schemaDocs: readonly SchemaDoc[]): string {
  return JSON.stringify(schemaDocs, null, 2);
}

function cloneSchemaDocs(schemaDocs: readonly SchemaDoc[]): SchemaDoc[] {
  return JSON.parse(JSON.stringify(schemaDocs)) as SchemaDoc[];
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (isRecord(value)) {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortJsonValue(value[key]);
        return acc;
      }, {});
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
