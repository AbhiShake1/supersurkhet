import type {
  RuntimeHealthService,
  RuntimeHealthSessionContext,
} from './runtime-health-service';

interface RuntimeHealthDocumentLike {
  hidden?: boolean;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

interface RuntimeHealthWindowLike {
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
  ): void;
}

interface StartLifecycleCaptureOptions {
  service: RuntimeHealthService;
  getSessionContext: () => RuntimeHealthSessionContext;
  windowRef?: RuntimeHealthWindowLike;
  documentRef?: RuntimeHealthDocumentLike;
}

export function startLifecycleCapture(options: StartLifecycleCaptureOptions) {
  const windowRef = options.windowRef ?? getRuntimeWindow();
  const documentRef = options.documentRef ?? getRuntimeDocument();

  if (!windowRef || !documentRef) {
    return () => {};
  }

  void options.service.captureSessionOpen(options.getSessionContext());

  let closeCaptured = false;

  const captureClose = (reason: string) => {
    if (closeCaptured) {
      return;
    }

    closeCaptured = true;
    void options.service.captureSessionClose(
      options.getSessionContext(),
      reason,
    );
  };

  const pageHideListener: EventListener = () => {
    captureClose('pagehide');
  };

  const visibilityListener: EventListener = () => {
    if (documentRef.hidden) {
      captureClose('visibility-hidden');
    }
  };

  windowRef.addEventListener('pagehide', pageHideListener);
  documentRef.addEventListener('visibilitychange', visibilityListener);

  return () => {
    windowRef.removeEventListener('pagehide', pageHideListener);
    documentRef.removeEventListener('visibilitychange', visibilityListener);
  };
}

function getRuntimeWindow(): RuntimeHealthWindowLike | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

function getRuntimeDocument(): RuntimeHealthDocumentLike | undefined {
  if (typeof document === 'undefined') {
    return undefined;
  }

  return document;
}
