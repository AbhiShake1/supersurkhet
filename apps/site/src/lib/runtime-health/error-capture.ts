import type {
  RuntimeHealthErrorContext,
  RuntimeHealthService,
  RuntimeHealthSessionContext,
} from './runtime-health-service';

interface RuntimeErrorEventLike {
  error?: unknown;
  message?: string;
  filename?: string;
}

interface RuntimePromiseRejectionEventLike {
  reason?: unknown;
}

interface RuntimeErrorWindowLike {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

interface StartErrorCaptureOptions {
  service: RuntimeHealthService;
  getSessionContext: () => RuntimeHealthSessionContext;
  windowRef?: RuntimeErrorWindowLike;
}

export function startErrorCapture(options: StartErrorCaptureOptions) {
  const windowRef = options.windowRef ?? getRuntimeWindow();

  if (!windowRef) {
    return () => {};
  }

  const reportError = (payload: {
    error: unknown;
    source?: string;
    rawMessage?: string;
  }) => {
    const sessionContext = options.getSessionContext();
    const parsed = normalizeRuntimeError(payload.error, payload.rawMessage);

    const errorContext: RuntimeHealthErrorContext = {
      ...sessionContext,
      fingerprint: createRuntimeErrorFingerprint({
        surface: sessionContext.surface,
        component: sessionContext.component,
        pluginId: sessionContext.pluginId,
        pluginVersion: sessionContext.pluginVersion,
        errorName: parsed.errorName,
        errorMessage: parsed.errorMessage,
        stackPreview: parsed.stackPreview,
      }),
      errorName: parsed.errorName,
      errorMessage: parsed.errorMessage,
      stackPreview: parsed.stackPreview,
    };

    void options.service.captureError(errorContext);
  };

  const errorListener = (event: Event) => {
    const runtimeEvent = event as unknown as RuntimeErrorEventLike;
    reportError({
      error: runtimeEvent.error,
      rawMessage: runtimeEvent.message,
      source: runtimeEvent.filename,
    });
  };

  const unhandledRejectionListener = (event: Event) => {
    const runtimeEvent = event as unknown as RuntimePromiseRejectionEventLike;
    reportError({
      error: runtimeEvent.reason,
      rawMessage: 'Unhandled promise rejection',
    });
  };

  windowRef.addEventListener('error', errorListener);
  windowRef.addEventListener('unhandledrejection', unhandledRejectionListener);

  return () => {
    windowRef.removeEventListener('error', errorListener);
    windowRef.removeEventListener(
      'unhandledrejection',
      unhandledRejectionListener,
    );
  };
}

export function createRuntimeErrorFingerprint(context: {
  surface: string;
  component?: string;
  pluginId?: string;
  pluginVersion?: string;
  errorName?: string;
  errorMessage?: string;
  stackPreview?: string;
}) {
  const payload = [
    context.surface,
    context.component ?? '',
    context.pluginId ?? '',
    context.pluginVersion ?? '',
    normalizeToken(context.errorName),
    normalizeToken(context.errorMessage),
    normalizeToken(context.stackPreview),
  ].join('|');

  return `eh_${fnv1aHex(payload)}`;
}

function normalizeRuntimeError(error: unknown, fallbackMessage?: string) {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message || fallbackMessage || 'Unknown error',
      stackPreview: firstStackLine(error.stack),
    };
  }

  if (typeof error === 'string') {
    return {
      errorName: 'Error',
      errorMessage: error,
      stackPreview: undefined,
    };
  }

  return {
    errorName: 'Error',
    errorMessage: fallbackMessage || 'Unknown error',
    stackPreview: undefined,
  };
}

function firstStackLine(stack: string | undefined) {
  if (!stack) {
    return undefined;
  }

  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)[0];
}

function normalizeToken(value: string | undefined) {
  if (!value) {
    return '';
  }

  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function fnv1aHex(input: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function getRuntimeWindow(): RuntimeErrorWindowLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}
