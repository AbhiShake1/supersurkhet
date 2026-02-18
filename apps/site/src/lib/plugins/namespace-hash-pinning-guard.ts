export type PluginRuntimeHashContext = {
  mode: 'release' | 'draft';
  manifestHash: string;
  artifactHash: string;
};

export type PluginRuntimeHashPin = {
  manifestHash?: string;
  artifactHash?: string;
};

export type NamespaceHashPinningGuardInput = {
  expectedNamespacePath: string;
  actualNamespacePath: string;
  context: PluginRuntimeHashContext;
  hashPin?: PluginRuntimeHashPin;
};

type NamespaceMismatchPayload = {
  expectedNamespacePath: string;
  actualNamespacePath: string;
};

type HashMismatchPayload = {
  mode: PluginRuntimeHashContext['mode'];
  expected: Pick<PluginRuntimeHashContext, 'manifestHash' | 'artifactHash'>;
  actual: PluginRuntimeHashPin;
};

export class PluginNamespaceMismatchError extends Error {
  readonly payload: NamespaceMismatchPayload;

  constructor(payload: NamespaceMismatchPayload) {
    super(
      `Plugin namespace mismatch: expected "${payload.expectedNamespacePath}" but got "${payload.actualNamespacePath}"`,
    );
    this.name = 'PluginNamespaceMismatchError';
    this.payload = payload;
  }
}

export class PluginSchemaHashMismatchError extends Error {
  readonly payload: HashMismatchPayload;

  constructor(payload: HashMismatchPayload) {
    super(
      `Plugin ${payload.mode} hash pin mismatch: expected ${JSON.stringify(payload.expected)} but got ${JSON.stringify(payload.actual)}`,
    );
    this.name = 'PluginSchemaHashMismatchError';
    this.payload = payload;
  }
}

export function assertNamespaceBoundary({
  expectedNamespacePath,
  actualNamespacePath,
}: Pick<
  NamespaceHashPinningGuardInput,
  'expectedNamespacePath' | 'actualNamespacePath'
>) {
  if (actualNamespacePath === expectedNamespacePath) {
    return;
  }
  throw new PluginNamespaceMismatchError({
    expectedNamespacePath,
    actualNamespacePath,
  });
}

export function assertRuntimeHashPinning({
  context,
  hashPin,
}: Pick<NamespaceHashPinningGuardInput, 'context' | 'hashPin'>) {
  if (!hashPin) {
    return;
  }

  const actual: PluginRuntimeHashPin = {};
  let hasMismatch = false;

  if (
    hashPin.manifestHash !== undefined &&
    hashPin.manifestHash !== context.manifestHash
  ) {
    actual.manifestHash = hashPin.manifestHash;
    hasMismatch = true;
  }

  if (
    hashPin.artifactHash !== undefined &&
    hashPin.artifactHash !== context.artifactHash
  ) {
    actual.artifactHash = hashPin.artifactHash;
    hasMismatch = true;
  }

  if (!hasMismatch) {
    return;
  }

  throw new PluginSchemaHashMismatchError({
    mode: context.mode,
    expected: {
      manifestHash: context.manifestHash,
      artifactHash: context.artifactHash,
    },
    actual,
  });
}

export function assertNamespaceHashPinningGuard(
  input: NamespaceHashPinningGuardInput,
) {
  assertNamespaceBoundary(input);
  assertRuntimeHashPinning(input);
}
