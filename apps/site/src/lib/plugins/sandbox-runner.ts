import type {
  PluginExecutionContext,
  RuntimeActionHandler,
} from '@/lib/plugins/types';

export class SandboxCapabilityError extends Error {
  constructor(actionId: string, capability: string) {
    super(
      `Sandbox blocked action "${actionId}" because capability "${capability}" is not allowed`,
    );
    this.name = 'SandboxCapabilityError';
  }
}

export class SandboxTimeoutError extends Error {
  constructor(actionId: string, timeoutMs: number) {
    super(`Sandbox timed out for action "${actionId}" after ${timeoutMs}ms`);
    this.name = 'SandboxTimeoutError';
  }
}

export type SandboxRunInput = {
  actionId: string;
  handler: RuntimeActionHandler;
  input: unknown;
  context: PluginExecutionContext;
  requiredCapabilities?: readonly string[];
};

export async function runSandboxedAction({
  actionId,
  handler,
  input,
  context,
  requiredCapabilities,
}: SandboxRunInput): Promise<unknown> {
  const allowedCapabilities = new Set(context.capabilities ?? []);
  for (const capability of requiredCapabilities ?? []) {
    if (!allowedCapabilities.has(capability)) {
      throw new SandboxCapabilityError(actionId, capability);
    }
  }

  const timeoutMs = context.timeoutMs ?? 5_000;
  let timeoutRef: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutRef = setTimeout(() => {
      reject(new SandboxTimeoutError(actionId, timeoutMs));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve(handler(input, context)),
      timeoutPromise,
    ]);
  } finally {
    if (timeoutRef) clearTimeout(timeoutRef);
  }
}
