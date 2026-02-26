import { z } from 'zod';

export const dataMatrixActionSchema = z.object({
  version: z.string().default('1.0'),
  action: z.enum([
    'wifi_connect',
    'profile_enrichment',
    'equipment_session',
    'restaurant_ordering',
    'product_interaction',
    'navigate',
    'form_request',
    'choice_selection',
    'notification',
    'equipment_control',
  ]),
  wifi: z
    .object({
      ssid: z.string(),
      password: z.string(),
      security: z.enum(['WPA2', 'WPA3', 'WEP', 'open']).optional(),
    })
    .optional(),
  navigation: z
    .object({
      url: z.string().url(),
      params: z
        .record(z.string(), z.union([z.string(), z.boolean(), z.number()]))
        .optional(),
    })
    .optional(),
  post_connect: z
    .object({
      notification: z.object({
        title: z.string(),
        message: z.string(),
      }),
    })
    .optional(),
  checks: z
    .array(
      z.object({
        field: z.string(),
        required: z.boolean().optional(),
        if_missing: z
          .object({
            type: z.enum(['form_request', 'choice_selection']),
            schema: z
              .object({
                title: z.string(),
                fields: z
                  .array(
                    z.object({
                      name: z.string(),
                      type: z.string(),
                      required: z.boolean().optional(),
                      label: z.string(),
                    }),
                  )
                  .optional(),
              })
              .optional(),
            options: z
              .array(
                z.object({
                  value: z.string(),
                  label: z.string(),
                }),
              )
              .optional(),
            multiple: z.boolean().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  on_complete: z
    .object({
      type: z.enum(['navigate', 'notification']),
      url: z.string().url().optional(),
      message: z.string().optional(),
    })
    .optional(),
  equipment: z
    .object({
      id: z.string(),
      type: z.string(),
      location: z.string(),
    })
    .optional(),
  session: z
    .object({
      duration: z.number(),
      max_duration: z.number().optional(),
      extendable: z.boolean().optional(),
    })
    .optional(),
  user_validation: z
    .object({
      membership_required: z.boolean().optional(),
      min_fitness_level: z.string().optional(),
    })
    .optional(),
  actions: z
    .object({
      on_start: z
        .object({
          type: z.enum(['equipment_control']),
          command: z.enum(['activate']),
          parameters: z.record(z.string(), z.string()).optional(),
        })
        .optional(),
      on_extend: z
        .object({
          type: z.enum(['confirm']),
          message: z.string(),
          actions: z
            .object({
              confirm: z.object({
                type: z.enum(['equipment_control']),
                command: z.enum(['extend_session']),
                duration: z.number(),
              }),
            })
            .optional(),
        })
        .optional(),
      on_end: z
        .object({
          type: z.enum(['equipment_control']),
          command: z.enum(['deactivate']),
        })
        .optional(),
    })
    .optional(),
  restaurant: z
    .object({
      id: z.string(),
      table: z.string(),
    })
    .optional(),
  flow: z
    .object({
      steps: z.array(
        z.object({
          step: z.number(),
          type: z.enum([
            'menu_display',
            'order_building',
            'order_confirmation',
            'payment_selection',
          ]),
          categories: z.array(z.string()).optional(),
          filters: z
            .object({
              dietary: z.string().optional(),
              availability: z.string().optional(),
            })
            .optional(),
          features: z
            .object({
              customization: z.boolean().optional(),
              special_requests: z.boolean().optional(),
              combo_suggestions: z.boolean().optional(),
            })
            .optional(),
          validation: z
            .object({
              allergen_check: z.boolean().optional(),
              preparation_time: z.string().optional(),
            })
            .optional(),
          options: z
            .array(z.enum(['card', 'mobile_payment', 'cash']))
            .optional(),
          tip_suggestions: z.array(z.number()).optional(),
        }),
      ),
    })
    .optional(),
  product: z
    .object({
      id: z.string(),
      sku: z.string(),
    })
    .optional(),
  interactions: z
    .object({
      info: z
        .object({
          type: z.enum(['product_details']),
          sections: z.array(z.string()),
        })
        .optional(),
      demo: z
        .object({
          type: z.enum(['ar_experience']),
          model: z.string(),
          features: z.array(z.string()),
        })
        .optional(),
      compare: z
        .object({
          type: z.enum(['product_comparison']),
          related_products: z.array(z.string()),
        })
        .optional(),
      purchase: z
        .object({
          type: z.enum(['quick_buy']),
          options: z.object({
            delivery: z.array(z.enum(['in_store', 'home_delivery'])),
            payment: z.array(z.string()),
          }),
        })
        .optional(),
    })
    .optional(),
});

export type DataMatrixAction = z.infer<typeof dataMatrixActionSchema>;

export const QR_ENGINE_DEFINITION_SCHEMA_VERSION = '2';
export const QR_SIGNED_REF_TOKEN_VERSION = '2';
export const QR_SIGNED_REF_PAYLOAD_VERSION = '2';

export const QR_LOCATION_POLICY_DEFAULTS = {
  mode: 'balanced',
  sampleWindowMs: 12_000,
  minSampleCount: 3,
  minDwellMs: 4_000,
  maxHorizontalAccuracyMeters: 50,
  minConfidence: 0.7,
  allowPartialExecution: true,
  maxSampleAgeMs: 5_000,
} as const;

const qrJsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(qrJsonValueSchema),
    z.record(z.string(), qrJsonValueSchema),
  ]),
);

export const qrRetryClassSchema = z.enum([
  'interactive_fast_fail',
  'device_bridge',
  'commit_background',
  'scheduled_batch',
]);

export const qrLocationPolicySchema = z
  .object({
    mode: z
      .enum(['disabled', 'balanced', 'precision'])
      .default(QR_LOCATION_POLICY_DEFAULTS.mode),
    sampleWindowMs: z
      .number()
      .int()
      .positive()
      .default(QR_LOCATION_POLICY_DEFAULTS.sampleWindowMs),
    minSampleCount: z
      .number()
      .int()
      .min(1)
      .default(QR_LOCATION_POLICY_DEFAULTS.minSampleCount),
    minDwellMs: z
      .number()
      .int()
      .min(0)
      .default(QR_LOCATION_POLICY_DEFAULTS.minDwellMs),
    maxHorizontalAccuracyMeters: z
      .number()
      .positive()
      .default(QR_LOCATION_POLICY_DEFAULTS.maxHorizontalAccuracyMeters),
    minConfidence: z
      .number()
      .min(0)
      .max(1)
      .default(QR_LOCATION_POLICY_DEFAULTS.minConfidence),
    allowPartialExecution: z
      .boolean()
      .default(QR_LOCATION_POLICY_DEFAULTS.allowPartialExecution),
    maxSampleAgeMs: z
      .number()
      .int()
      .min(0)
      .default(QR_LOCATION_POLICY_DEFAULTS.maxSampleAgeMs),
  })
  .strict();

export const qrEngineRetryPolicySchema = z
  .object({
    maxAttempts: z.number().int().min(1),
    backoffMs: z.number().int().min(0).optional(),
  })
  .strict();

export const qrEngineNodeSchema = z
  .object({
    nodeId: z.string().min(1),
    kind: z.enum(['action', 'branch', 'delay', 'humanGate']).default('action'),
    actionId: z.string().min(1).optional(),
    input: qrJsonValueSchema.optional(),
    runIf: qrJsonValueSchema.optional(),
    retryClass: qrRetryClassSchema.optional(),
    retryPolicy: qrEngineRetryPolicySchema.optional(),
    timeoutMs: z.number().int().positive().optional(),
    delayMs: z.number().int().min(0).optional(),
    metadata: z.record(z.string(), qrJsonValueSchema).optional(),
  })
  .strict()
  .superRefine((node, ctx) => {
    if (node.kind === 'action' && !node.actionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actionId'],
        message: 'action nodes must define actionId',
      });
    }

    if (node.kind === 'delay' && typeof node.delayMs !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['delayMs'],
        message: 'delay nodes must define delayMs',
      });
    }
  });

export const qrEngineEdgeSchema = z
  .object({
    from: z.string().min(1),
    to: z.string().min(1),
    on: z.enum(['success', 'failure', 'always']).optional(),
    condition: qrJsonValueSchema.optional(),
  })
  .strict();

export const qrEngineDefinitionSchema = z
  .object({
    schemaVersion: z.string().default(QR_ENGINE_DEFINITION_SCHEMA_VERSION),
    engineId: z.string().min(1),
    engineVersion: z.string().min(1),
    businessId: z.string().min(1),
    title: z.string().optional(),
    lane: z.literal('deterministic').default('deterministic'),
    entryNodeId: z.string().min(1),
    defaultRetryClass: qrRetryClassSchema.default('interactive_fast_fail'),
    locationPolicy: qrLocationPolicySchema.default(QR_LOCATION_POLICY_DEFAULTS),
    nodes: z.array(qrEngineNodeSchema).min(1),
    edges: z.array(qrEngineEdgeSchema).default([]),
    metadata: z.record(z.string(), qrJsonValueSchema).optional(),
  })
  .strict()
  .superRefine((definition, ctx) => {
    const seenNodeIds = new Set<string>();
    const duplicateNodeIds = new Set<string>();
    for (const node of definition.nodes) {
      if (seenNodeIds.has(node.nodeId)) {
        duplicateNodeIds.add(node.nodeId);
      }
      seenNodeIds.add(node.nodeId);
    }

    for (const nodeId of duplicateNodeIds) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['nodes'],
        message: `duplicate nodeId detected: ${nodeId}`,
      });
    }

    if (!seenNodeIds.has(definition.entryNodeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['entryNodeId'],
        message: 'entryNodeId must reference a node in nodes',
      });
    }

    for (const [edgeIndex, edge] of definition.edges.entries()) {
      if (!seenNodeIds.has(edge.from)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', edgeIndex, 'from'],
          message: 'edge.from must reference an existing nodeId',
        });
      }
      if (!seenNodeIds.has(edge.to)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['edges', edgeIndex, 'to'],
          message: 'edge.to must reference an existing nodeId',
        });
      }
    }
  });

export const qrSignedRefTargetSchema = z
  .object({
    businessId: z.string().min(1),
    engineId: z.string().min(1),
    engineVersion: z.string().min(1),
    definitionHash: z.string().min(1).optional(),
  })
  .strict();

export const qrSignedRefPayloadSchema = z
  .object({
    tokenVersion: z.string().default(QR_SIGNED_REF_TOKEN_VERSION),
    payloadVersion: z.string().default(QR_SIGNED_REF_PAYLOAD_VERSION),
    lane: z.literal('deterministic').default('deterministic'),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    notBefore: z.number().int().nonnegative().optional(),
    nonce: z.string().min(8),
    reference: qrSignedRefTargetSchema,
    locationPolicyOverride: qrLocationPolicySchema.partial().optional(),
    metadata: z.record(z.string(), qrJsonValueSchema).optional(),
  })
  .strict()
  .superRefine((payload, ctx) => {
    if (payload.expiresAt <= payload.issuedAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiresAt'],
        message: 'expiresAt must be greater than issuedAt',
      });
    }

    if (
      typeof payload.notBefore === 'number' &&
      payload.notBefore > payload.expiresAt
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['notBefore'],
        message: 'notBefore cannot be after expiresAt',
      });
    }
  });

export const qrSignedRefTokenSchema = z
  .object({
    payload: qrSignedRefPayloadSchema,
    signature: z.string().min(16),
    signatureAlgorithm: z.enum(['HS256', 'Ed25519']).default('HS256'),
    keyId: z.string().min(1).optional(),
  })
  .strict();

export type QrRetryClass = z.infer<typeof qrRetryClassSchema>;
export type QrLocationPolicy = z.infer<typeof qrLocationPolicySchema>;
export type QrEngineRetryPolicy = z.infer<typeof qrEngineRetryPolicySchema>;
export type QrEngineNode = z.infer<typeof qrEngineNodeSchema>;
export type QrEngineEdge = z.infer<typeof qrEngineEdgeSchema>;
export type QrEngineDefinition = z.infer<typeof qrEngineDefinitionSchema>;
export type QrSignedRefTarget = z.infer<typeof qrSignedRefTargetSchema>;
export type QrSignedRefPayload = z.infer<typeof qrSignedRefPayloadSchema>;
export type QrSignedRefToken = z.infer<typeof qrSignedRefTokenSchema>;

type QrParseFailure<TCode extends string> = {
  ok: false;
  code: TCode;
  issues?: z.ZodIssue[];
};

type QrParseSuccess<TData> = {
  ok: true;
  value: TData;
};

export type QrSignedRefPayloadParseErrorCode =
  | 'invalid-signed-ref-payload'
  | 'unsupported-token-version'
  | 'unsupported-payload-version'
  | 'token-not-active'
  | 'token-expired';

export type QrSignedRefPayloadParseResult =
  | QrParseSuccess<QrSignedRefPayload>
  | QrParseFailure<QrSignedRefPayloadParseErrorCode>;

export type QrSignedRefTokenParseErrorCode =
  | 'invalid-json'
  | 'invalid-signed-ref-token'
  | QrSignedRefPayloadParseErrorCode;

export type QrSignedRefTokenParseResult =
  | QrParseSuccess<QrSignedRefToken>
  | QrParseFailure<QrSignedRefTokenParseErrorCode>;

export type QrEngineDefinitionParseErrorCode =
  | 'invalid-engine-definition'
  | 'unsupported-engine-schema-version';

export type QrEngineDefinitionParseResult =
  | QrParseSuccess<QrEngineDefinition>
  | QrParseFailure<QrEngineDefinitionParseErrorCode>;

function resolveNowSeconds(nowSeconds?: number): number {
  if (typeof nowSeconds === 'number' && Number.isFinite(nowSeconds)) {
    return Math.floor(nowSeconds);
  }
  return Math.floor(Date.now() / 1000);
}

export function isSupportedQrSignedRefTokenVersion(version: string): boolean {
  return version === QR_SIGNED_REF_TOKEN_VERSION;
}

export function isSupportedQrSignedRefPayloadVersion(version: string): boolean {
  return version === QR_SIGNED_REF_PAYLOAD_VERSION;
}

export function isSupportedQrEngineDefinitionSchemaVersion(
  version: string,
): boolean {
  return version === QR_ENGINE_DEFINITION_SCHEMA_VERSION;
}

export function parseQrSignedRefPayload(
  input: unknown,
  options: {
    expectedTokenVersion?: string;
    expectedPayloadVersion?: string;
    nowSeconds?: number;
  } = {},
): QrSignedRefPayloadParseResult {
  const parsed = qrSignedRefPayloadSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid-signed-ref-payload',
      issues: parsed.error.issues,
    };
  }

  const payload = parsed.data;
  const expectedTokenVersion =
    options.expectedTokenVersion ?? QR_SIGNED_REF_TOKEN_VERSION;
  const expectedPayloadVersion =
    options.expectedPayloadVersion ?? QR_SIGNED_REF_PAYLOAD_VERSION;

  if (payload.tokenVersion !== expectedTokenVersion) {
    return { ok: false, code: 'unsupported-token-version' };
  }

  if (payload.payloadVersion !== expectedPayloadVersion) {
    return { ok: false, code: 'unsupported-payload-version' };
  }

  const nowSeconds = resolveNowSeconds(options.nowSeconds);
  if (typeof payload.notBefore === 'number' && nowSeconds < payload.notBefore) {
    return { ok: false, code: 'token-not-active' };
  }

  if (payload.expiresAt <= nowSeconds) {
    return { ok: false, code: 'token-expired' };
  }

  return { ok: true, value: payload };
}

export function parseQrSignedRefToken(
  input: unknown,
  options: {
    expectedTokenVersion?: string;
    expectedPayloadVersion?: string;
    nowSeconds?: number;
  } = {},
): QrSignedRefTokenParseResult {
  const parsed = qrSignedRefTokenSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid-signed-ref-token',
      issues: parsed.error.issues,
    };
  }

  const payloadResult = parseQrSignedRefPayload(parsed.data.payload, options);
  if (!payloadResult.ok) {
    return payloadResult;
  }

  return {
    ok: true,
    value: {
      ...parsed.data,
      payload: payloadResult.value,
    },
  };
}

export function parseQrSignedRefTokenFromString(
  input: string,
  options: {
    expectedTokenVersion?: string;
    expectedPayloadVersion?: string;
    nowSeconds?: number;
  } = {},
): QrSignedRefTokenParseResult {
  try {
    const parsed = JSON.parse(input);
    return parseQrSignedRefToken(parsed, options);
  } catch {
    return { ok: false, code: 'invalid-json' };
  }
}

export function parseQrEngineDefinition(
  input: unknown,
  options: {
    expectedSchemaVersion?: string;
  } = {},
): QrEngineDefinitionParseResult {
  const parsed = qrEngineDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: 'invalid-engine-definition',
      issues: parsed.error.issues,
    };
  }

  const expectedSchemaVersion =
    options.expectedSchemaVersion ?? QR_ENGINE_DEFINITION_SCHEMA_VERSION;
  if (parsed.data.schemaVersion !== expectedSchemaVersion) {
    return { ok: false, code: 'unsupported-engine-schema-version' };
  }

  return { ok: true, value: parsed.data };
}
