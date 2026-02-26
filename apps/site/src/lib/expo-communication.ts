// Utility functions for communication between web app and Expo app
import {
  DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE,
  type DataMatrixDeviceCallbackEnvelope,
  datamatrixDeviceCallbackEnvelopeSchema,
} from '@/lib/datamatrix/device-callback';

type ExpoInboundMessage =
  | DataMatrixDeviceCallbackEnvelope
  | {
      type: Exclude<string, typeof DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE>;
      payload?: unknown;
    };

/**
 * Check if we're running in an Expo WebView context
 */
export const isExpoContext = (): boolean => {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
};

const parsePossibleMessage = (message: unknown) => {
  if (typeof message === 'string') {
    try {
      return JSON.parse(message) as unknown;
    } catch {
      return null;
    }
  }

  return message;
};

const isObjectWithType = (
  value: unknown,
): value is { type: string; payload?: unknown } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  );
};

export const isDataMatrixDeviceCallbackMessage = (value: {
  type: string;
  payload?: unknown;
}): value is DataMatrixDeviceCallbackEnvelope => {
  return (
    value.type === DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE &&
    datamatrixDeviceCallbackEnvelopeSchema.safeParse(value).success
  );
};

export const parseExpoBridgeMessage = (
  message: unknown,
): ExpoInboundMessage | null => {
  const parsed = parsePossibleMessage(message);
  if (!isObjectWithType(parsed)) {
    return null;
  }
  if (isDataMatrixDeviceCallbackMessage(parsed)) {
    return datamatrixDeviceCallbackEnvelopeSchema.parse(parsed);
  }

  return {
    ...parsed,
    type: parsed.type as Exclude<
      string,
      typeof DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE
    >,
  };
};

const unwrapWebToNativeMessage = (message: ExpoInboundMessage) => {
  if (message.type !== 'WEB_TO_NATIVE') {
    return message;
  }

  const payload = parsePossibleMessage(message.payload);
  if (isObjectWithType(payload)) {
    return payload;
  }

  return message;
};

export const parseExpoBridgeMessageAndUnwrap = (
  message: unknown,
): ExpoInboundMessage | null => {
  const parsed = parseExpoBridgeMessage(message);
  if (!parsed) {
    return null;
  }

  return unwrapWebToNativeMessage(parsed);
};

/**
 * Send a message to the Expo app
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export const sendMessageToExpo = (message: any): void => {
  try {
    if (isExpoContext()) {
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
    } else {
      console.log('Not in Expo context, message not sent:', message);
    }
  } catch (error) {
    console.error('Failed to send message to Expo app:', error);
  }
};

/**
 * Send a DataMatrix action to the Expo app
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export const sendDataMatrixActionToExpo = (action: any): void => {
  sendMessageToExpo({
    type: 'DATAMATRIX_ACTION',
    payload: action,
  });
};

/**
 * Send a navigation request to the Expo app
 */
export const sendNavigationToExpo = (navigation: {
  url: string;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  params?: Record<string, any>;
}): void => {
  sendMessageToExpo({
    type: 'NAVIGATE',
    payload: navigation,
  });
};

/**
 * Send a notification request to the Expo app
 */
export const sendNotificationToExpo = (notification: {
  title: string;
  message: string;
}): void => {
  sendMessageToExpo({
    type: 'NOTIFICATION',
    payload: notification,
  });
};
