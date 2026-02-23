import {
  compileVisualDerivationsToDeriveIr,
  type VisualDerivation,
} from '@/features/plugin-builder/domain/ir/derivation-ir-compiler';
import {
  compileRefinementIr,
  type VisualRefinementRule,
} from '@/features/plugin-builder/domain/ir/refinement-ir-compiler';
import { validateWorkflowActionCapabilities } from '@/features/plugin-builder/domain/validation/action-capability-validator';
import { validateWorkflowDags } from '@/features/plugin-builder/domain/validation/workflow-dag-validator';
import { canonicalizeJson } from '@/lib/plugins/plugin-service';
import { compileSchemaDoc } from '@/lib/plugins/schema-compiler';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  SchemaDoc,
  SchemaFieldDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';

export type CompileVerifySeverity = 'error' | 'warning' | 'info';

export type CompileVerifyDiagnostic = {
  category:
    | 'schema-compile'
    | 'derivation-compile'
    | 'refinement-compile'
    | 'workflow-validation'
    | 'capability-validation';
  code: string;
  severity: CompileVerifySeverity;
  message: string;
  path: string[];
};

export type PluginsV2CompileVerifyInput = {
  pluginId: string;
  version: string;
  docs?: {
    title?: string;
    description?: string;
  };
  actionManifest?: ActionManifestDoc[];
  schemaDocs?: SchemaDoc[];
  workflows?: WorkflowDoc[];
  adminTabs?: AdminTabDoc[];
  capabilityEnvelope?: string[];
  runtimeTarget?: 'sandbox-worker' | 'core';
  deniedActionIds?: string[];
};

export type PluginsV2CompileVerifyResult = {
  diagnostics: {
    all: CompileVerifyDiagnostic[];
    bySeverity: Record<CompileVerifySeverity, number>;
  };
  hashPreview: {
    manifestHash: string;
    artifactHash: string;
    artifactPayload: {
      schemaDocs: SchemaDoc[];
      workflows: WorkflowDoc[];
      adminTabs: AdminTabDoc[];
    };
  };
  parity: {
    schemaDocs: {
      input: number;
      compiled: number;
      matches: boolean;
    };
    derivations: {
      input: number;
      compiled: number;
      matches: boolean;
    };
    refinements: {
      input: number;
      compiled: number;
      matches: boolean;
    };
    workflows: {
      input: number;
      validated: number;
      matches: boolean;
    };
    diagnostics: {
      total: number;
      blocking: boolean;
    };
  };
};

export function runPluginsV2CompileVerifyPipeline(
  input: PluginsV2CompileVerifyInput,
): PluginsV2CompileVerifyResult {
  const schemaDocs = input.schemaDocs ?? [];
  const workflows = input.workflows ?? [];
  const actionManifest = input.actionManifest ?? [];
  const adminTabs = input.adminTabs ?? [];
  const capabilityEnvelope = input.capabilityEnvelope ?? [];
  const runtimeTarget = input.runtimeTarget ?? 'sandbox-worker';

  const diagnostics: CompileVerifyDiagnostic[] = [];

  let compiledSchemaCount = 0;
  let derivationInputCount = 0;
  let derivationCompiledCount = 0;
  let refinementInputCount = 0;
  let refinementCompiledCount = 0;

  for (const [schemaIndex, schemaDoc] of schemaDocs.entries()) {
    const schemaId = schemaDoc.schemaId || `schema-${schemaIndex}`;
    const schemaCompileViolations = collectSchemaCompileViolations(
      schemaDoc.fields,
    );

    for (const violation of schemaCompileViolations) {
      diagnostics.push({
        category: 'schema-compile',
        code: 'schema-compile-failed',
        severity: 'error',
        message: violation.message,
        path: ['schemaDocs', schemaId, ...violation.path],
      });
    }

    if (schemaCompileViolations.length === 0) {
      try {
        compileSchemaDoc(schemaDoc);
        compiledSchemaCount += 1;
      } catch (error) {
        diagnostics.push({
          category: 'schema-compile',
          code: 'schema-compile-failed',
          severity: 'error',
          message: getErrorMessage(error),
          path: ['schemaDocs', schemaId],
        });
      }
    }

    const fieldLocations = collectFieldLocations(schemaDoc.fields);
    for (const location of fieldLocations) {
      const behavior = location.field.behavior;
      if (!behavior) {
        continue;
      }

      if (behavior.derivations?.length) {
        derivationInputCount += behavior.derivations.length;

        const visualDerivations: VisualDerivation[] = behavior.derivations.map(
          (derivation) => ({
            target:
              derivation.target === 'value'
                ? { branch: 'value' }
                : {
                    branch: derivation.target,
                    key: derivation.key ?? '',
                  },
            expression: derivation.expression,
          }),
        );

        const derivationResult =
          compileVisualDerivationsToDeriveIr(visualDerivations);
        derivationCompiledCount += derivationResult.derivations.length;

        for (const diagnostic of derivationResult.diagnostics) {
          diagnostics.push({
            category: 'derivation-compile',
            code: diagnostic.code,
            severity: 'error',
            message: diagnostic.message,
            path: [
              'schemaDocs',
              schemaId,
              'fields',
              ...location.path,
              'behavior',
              ...diagnostic.path,
            ],
          });
        }
      }

      if (behavior.refinements?.length) {
        const rulesById = new Map<string, number>();
        const rules: VisualRefinementRule[] = behavior.refinements.map(
          (refinement, index) => {
            const ruleId = `field-rule-${index}`;
            rulesById.set(ruleId, index);

            return {
              id: ruleId,
              code: refinement.code,
              message: refinement.message,
              when: refinement.when,
              paths: refinement.path ? [refinement.path] : undefined,
            };
          },
        );

        refinementInputCount += rules.length;

        const refinementResult = compileRefinementIr({
          schema: {
            schemaId,
            fields: schemaDoc.fields,
          },
          pathScope: location.path,
          rules,
        });

        refinementCompiledCount += refinementResult.refinements.length;

        for (const diagnostic of refinementResult.diagnostics) {
          const ruleIndex =
            diagnostic.ruleId === '__scope__'
              ? -1
              : (rulesById.get(diagnostic.ruleId) ?? -1);

          diagnostics.push({
            category: 'refinement-compile',
            code: diagnostic.code,
            severity: diagnostic.code === 'invalid-path' ? 'warning' : 'error',
            message: diagnostic.message,
            path:
              ruleIndex >= 0
                ? [
                    'schemaDocs',
                    schemaId,
                    'fields',
                    ...location.path,
                    'behavior',
                    'refinements',
                    String(ruleIndex),
                    ...diagnostic.path,
                  ]
                : [
                    'schemaDocs',
                    schemaId,
                    'fields',
                    ...location.path,
                    'behavior',
                    'refinements',
                  ],
          });
        }
      }
    }

    if (schemaDoc.refinements?.length) {
      const rulesById = new Map<string, number>();
      const rules: VisualRefinementRule[] = schemaDoc.refinements.map(
        (refinement, index) => {
          const ruleId = `schema-rule-${index}`;
          rulesById.set(ruleId, index);

          return {
            id: ruleId,
            code: refinement.code,
            message: refinement.message,
            when: refinement.when,
            paths: refinement.path ? [refinement.path] : undefined,
          };
        },
      );

      refinementInputCount += rules.length;

      const refinementResult = compileRefinementIr({
        schema: {
          schemaId,
          fields: schemaDoc.fields,
        },
        rules,
      });

      refinementCompiledCount += refinementResult.refinements.length;

      for (const diagnostic of refinementResult.diagnostics) {
        const ruleIndex =
          diagnostic.ruleId === '__scope__'
            ? -1
            : (rulesById.get(diagnostic.ruleId) ?? -1);

        diagnostics.push({
          category: 'refinement-compile',
          code: diagnostic.code,
          severity: diagnostic.code === 'invalid-path' ? 'warning' : 'error',
          message: diagnostic.message,
          path:
            ruleIndex >= 0
              ? [
                  'schemaDocs',
                  schemaId,
                  'refinements',
                  String(ruleIndex),
                  ...diagnostic.path,
                ]
              : ['schemaDocs', schemaId, 'refinements'],
        });
      }
    }
  }

  const workflowDiagnostics = validateWorkflowDags(workflows).diagnostics;
  for (const diagnostic of workflowDiagnostics) {
    diagnostics.push({
      category: 'workflow-validation',
      code: diagnostic.code,
      severity: 'error',
      message: diagnostic.message,
      path: diagnostic.path,
    });
  }

  const capabilityDiagnostics = validateWorkflowActionCapabilities({
    workflows,
    actionManifest,
    capabilityEnvelope,
    runtimeTarget,
    deniedActionIds: input.deniedActionIds,
  }).diagnostics;

  for (const diagnostic of capabilityDiagnostics) {
    diagnostics.push({
      category: 'capability-validation',
      code: diagnostic.code,
      severity:
        diagnostic.code === 'missing-capability' ||
        diagnostic.code === 'runtime-target-mismatch'
          ? 'warning'
          : 'error',
      message: diagnostic.message,
      path: diagnostic.path,
    });
  }

  diagnostics.sort((left, right) => {
    const leftKey = [
      left.category,
      left.code,
      left.severity,
      left.path.join('\u0000'),
      left.message,
    ].join('\u0001');
    const rightKey = [
      right.category,
      right.code,
      right.severity,
      right.path.join('\u0000'),
      right.message,
    ].join('\u0001');

    return leftKey.localeCompare(rightKey);
  });

  const manifestPayload = {
    pluginId: input.pluginId,
    version: input.version,
    docs: input.docs,
    actionManifest,
    schemaDocs,
    workflows,
    adminTabs,
  };

  const artifactPayload = {
    schemaDocs,
    workflows,
    adminTabs,
  };

  const bySeverity = diagnostics.reduce(
    (acc, diagnostic) => {
      acc[diagnostic.severity] += 1;
      return acc;
    },
    {
      error: 0,
      warning: 0,
      info: 0,
    } satisfies Record<CompileVerifySeverity, number>,
  );

  return {
    diagnostics: {
      all: diagnostics,
      bySeverity,
    },
    hashPreview: {
      manifestHash: sha256(canonicalizeJson(manifestPayload)),
      artifactHash: sha256(canonicalizeJson(artifactPayload)),
      artifactPayload,
    },
    parity: {
      schemaDocs: {
        input: schemaDocs.length,
        compiled: compiledSchemaCount,
        matches: schemaDocs.length === compiledSchemaCount,
      },
      derivations: {
        input: derivationInputCount,
        compiled: derivationCompiledCount,
        matches: derivationInputCount === derivationCompiledCount,
      },
      refinements: {
        input: refinementInputCount,
        compiled: refinementCompiledCount,
        matches: refinementInputCount === refinementCompiledCount,
      },
      workflows: {
        input: workflows.length,
        validated: workflows.length,
        matches: true,
      },
      diagnostics: {
        total: diagnostics.length,
        blocking: bySeverity.error > 0,
      },
    },
  };
}

function collectFieldLocations(
  fields: readonly SchemaFieldDoc[],
  parentPath: string[] = [],
): Array<{ field: SchemaFieldDoc; path: string[] }> {
  const locations: Array<{ field: SchemaFieldDoc; path: string[] }> = [];

  for (const field of fields) {
    const path = [...parentPath, field.key];
    locations.push({ field, path });

    if (field.type === 'object' && field.fields?.length) {
      locations.push(...collectFieldLocations(field.fields, path));
    }

    if (
      field.type === 'array' &&
      field.itemType?.type === 'object' &&
      field.itemType.fields?.length
    ) {
      locations.push(...collectFieldLocations(field.itemType.fields, path));
    }
  }

  return locations;
}

function collectSchemaCompileViolations(
  fields: readonly SchemaFieldDoc[],
  parentPath: string[] = [],
): Array<{ path: string[]; message: string }> {
  const violations: Array<{ path: string[]; message: string }> = [];

  for (const field of fields) {
    const path = [...parentPath, 'fields', field.key];
    if (field.type === 'enum' && (field.enumValues?.length ?? 0) === 0) {
      violations.push({
        path,
        message: `Schema enum field "${field.key}" requires at least one enum value`,
      });
    }

    if (field.type === 'object' && field.fields?.length) {
      violations.push(...collectSchemaCompileViolations(field.fields, path));
    }

    if (
      field.type === 'array' &&
      field.itemType?.type === 'object' &&
      field.itemType.fields?.length
    ) {
      violations.push(
        ...collectSchemaCompileViolations(field.itemType.fields, [
          ...path,
          'itemType',
        ]),
      );
    }
  }

  return violations;
}

function sha256(input: string) {
  // Browser-safe deterministic hash (non-cryptographic) that produces
  // a stable 64-char lowercase hex fingerprint for compile previews.
  const seedA = fnv1a32(input, 0x811c9dc5);
  const seedB = fnv1a32(input, 0x9e3779b9);
  const seedC = fnv1a32(input, 0x85ebca6b);
  const seedD = fnv1a32(input, 0xc2b2ae35);

  // Expand to 256 bits by chaining mixed rounds from the 4 seeds.
  const parts: number[] = [];
  let a = seedA;
  let b = seedB;
  let c = seedC;
  let d = seedD;
  for (let index = 0; index < 8; index += 1) {
    a = mix32(a ^ rotateLeft32(b, 5) ^ (index * 0x9e3779b9));
    b = mix32(b ^ rotateLeft32(c, 7) ^ (index * 0x85ebca6b));
    c = mix32(c ^ rotateLeft32(d, 11) ^ (index * 0xc2b2ae35));
    d = mix32(d ^ rotateLeft32(a, 13) ^ (index * 0x27d4eb2f));
    parts.push((a ^ b ^ c ^ d) >>> 0);
  }

  return parts.map((value) => value.toString(16).padStart(8, '0')).join('');
}

function fnv1a32(input: string, seed: number) {
  let hash = seed >>> 0;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function rotateLeft32(value: number, shift: number) {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

function mix32(value: number) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d) >>> 0;
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b) >>> 0;
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
