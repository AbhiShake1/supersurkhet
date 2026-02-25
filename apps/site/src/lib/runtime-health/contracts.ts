import { z } from 'zod';

const isoDateTimeSchema = z.string().datetime({ offset: true });

const sensitiveKeyFragments = [
  'token',
  'secret',
  'credential',
  'password',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'api-key',
  'privatekey',
  'private_key',
  'private-key',
  'rawpayload',
  'raw_payload',
  'raw-payload',
  'payloadraw',
  'payload_raw',
  'payload-raw',
] as const;

const forbiddenExactFieldNames = new Set([
  'payload',
  'raw',
  'rawpayload',
  'raw_payload',
  'raw-payload',
]);

function isSensitiveFieldName(fieldName: string): boolean {
  const normalized = fieldName.trim().toLowerCase();
  if (forbiddenExactFieldNames.has(normalized)) {
    return true;
  }

  return sensitiveKeyFragments.some((fragment) =>
    normalized.includes(fragment),
  );
}

export type SanitizedTelemetryScalar = string | number | boolean | null;
export type SanitizedTelemetryValue =
  | SanitizedTelemetryScalar
  | SanitizedTelemetryValue[]
  | Record<string, SanitizedTelemetryValue>;

export type SanitizedTelemetryObject = Record<string, SanitizedTelemetryValue>;

const sanitizedTelemetryScalarSchema = z.union([
  z.string().max(1024),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const sanitizedTelemetryValueSchema: z.ZodType<SanitizedTelemetryValue> =
  z.lazy(() =>
    z.union([
      sanitizedTelemetryScalarSchema,
      z.array(sanitizedTelemetryValueSchema),
      z.record(z.string(), sanitizedTelemetryValueSchema),
    ]),
  );

export const sanitizedTelemetryObjectSchema: z.ZodType<SanitizedTelemetryObject> =
  z
    .record(z.string(), sanitizedTelemetryValueSchema)
    .superRefine((value, ctx) => {
      const scan = (node: SanitizedTelemetryValue, trail: string[]): void => {
        if (Array.isArray(node)) {
          node.forEach((item, index) => {
            scan(item, [...trail, String(index)]);
          });
          return;
        }

        if (!node || typeof node !== 'object') {
          return;
        }

        for (const [key, nestedValue] of Object.entries(node)) {
          if (isSensitiveFieldName(key)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [...trail, key],
              message: 'Sensitive telemetry fields are not allowed.',
            });
          }

          scan(nestedValue, [...trail, key]);
        }
      };

      scan(value, []);
    });

export const runtimeHealthEventTypeSchema = z.enum([
  'session-open',
  'session-close',
  'runtime-error',
]);

export const runtimeHealthSurfaceSchema = z.enum([
  'app-shell',
  'plugin-runtime',
  'assistant',
  'ui-builder',
]);

export const runtimeHealthSeveritySchema = z.enum(['info', 'warn', 'error']);

export const sanitizedTelemetryEnvelopeSchema = z
  .object({
    sessionId: z.string().min(1),
    requestId: z.string().min(1).optional(),
    surface: runtimeHealthSurfaceSchema,
    component: z.string().min(1).max(128).optional(),
    route: z.string().min(1).max(256).optional(),
    pluginId: z.string().min(1).max(128).optional(),
    pluginVersion: z.string().min(1).max(64).optional(),
    fingerprint: z.string().min(1).max(256).optional(),
    severity: runtimeHealthSeveritySchema,
    message: z.string().min(1).max(1024).optional(),
    tags: z.record(z.string(), z.string().max(128)).optional(),
    metrics: z.record(z.string(), z.number().finite()).optional(),
    flags: z.record(z.string(), z.boolean()).optional(),
    attributes: sanitizedTelemetryObjectSchema.optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    for (const key of Object.keys(value)) {
      if (isSensitiveFieldName(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: 'Sensitive telemetry fields are not allowed.',
        });
      }
    }
  });

export const runtimeHealthErrorSummarySchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    fingerprint: z.string().min(1).max(256),
    handled: z.boolean().optional(),
  })
  .strict();

export const runtimeHealthEventDocSchema = z
  .object({
    id: z.string().min(1),
    businessId: z.string().min(1),
    eventType: runtimeHealthEventTypeSchema,
    occurredAt: isoDateTimeSchema,
    telemetry: sanitizedTelemetryEnvelopeSchema,
    error: runtimeHealthErrorSummarySchema.optional(),
    source: z
      .object({
        origin: z.enum(['client', 'server']),
        runtimeVersion: z.string().min(1).optional(),
      })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.eventType === 'runtime-error') {
      const hasFingerprint =
        value.error?.fingerprint || value.telemetry.fingerprint;
      if (!hasFingerprint) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['error'],
          message: 'Runtime error events require an error fingerprint.',
        });
      }
    }
  });

export const lastKnownGoodTargetTypeSchema = z.enum([
  'plugin-install-state',
  'data-snapshot',
  'project-surface',
]);

export const lastKnownGoodSnapshotDocSchema = z
  .object({
    id: z.string().min(1),
    businessId: z.string().min(1),
    targetType: lastKnownGoodTargetTypeSchema,
    targetId: z.string().min(1),
    snapshotId: z.string().min(1),
    sourceEventId: z.string().min(1).optional(),
    pluginId: z.string().min(1).optional(),
    pluginVersion: z.string().min(1).optional(),
    capturedAt: isoDateTimeSchema,
  })
  .strict();

export const aiSafetyCapabilityClassSchema = z.enum([
  'runtime-health',
  'rollback-recovery',
  'ai-mutation-controls',
  'business-insights',
  'ui-builder-focus',
]);

export const aiSafetySensitiveDetailClassSchema = z.enum([
  'secret-material',
  'token-material',
  'raw-telemetry-payload',
  'credential-payload',
  'internal-execution-payload',
]);

export const aiSafetyDisclosurePolicySchema = z
  .object({
    id: z.string().min(1),
    policyVersion: z.literal('1'),
    disclosureMode: z.literal('high-level-only'),
    allowedCapabilityClasses: z.array(aiSafetyCapabilityClassSchema).nonempty(),
    blockedDetailClasses: z
      .array(aiSafetySensitiveDetailClassSchema)
      .nonempty(),
    updatedAt: isoDateTimeSchema,
  })
  .strict();

export type SanitizedTelemetryEnvelopeDoc = z.infer<
  typeof sanitizedTelemetryEnvelopeSchema
>;
export type RuntimeHealthErrorSummaryDoc = z.infer<
  typeof runtimeHealthErrorSummarySchema
>;
export type RuntimeHealthEventDoc = z.infer<typeof runtimeHealthEventDocSchema>;
export type LastKnownGoodSnapshotDoc = z.infer<
  typeof lastKnownGoodSnapshotDocSchema
>;
export type AiSafetyCapabilityClass = z.infer<
  typeof aiSafetyCapabilityClassSchema
>;
export type AiSafetySensitiveDetailClass = z.infer<
  typeof aiSafetySensitiveDetailClassSchema
>;
export type AiSafetyDisclosurePolicy = z.infer<
  typeof aiSafetyDisclosurePolicySchema
>;

export function parseRuntimeHealthEventDoc(
  input: unknown,
): RuntimeHealthEventDoc {
  return runtimeHealthEventDocSchema.parse(input);
}

export function parseLastKnownGoodSnapshotDoc(
  input: unknown,
): LastKnownGoodSnapshotDoc {
  return lastKnownGoodSnapshotDocSchema.parse(input);
}

export function parseAiSafetyDisclosurePolicy(
  input: unknown,
): AiSafetyDisclosurePolicy {
  return aiSafetyDisclosurePolicySchema.parse(input);
}
