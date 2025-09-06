// Utility functions for communication between web app and Expo app

/**
 * Check if we're running in an Expo WebView context
 */
export const isExpoContext = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).ReactNativeWebView;
};

/**
 * Send a message to the Expo app
 */
export const sendMessageToExpo = (message: any): void => {
  try {
    if (isExpoContext()) {
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
export const sendDataMatrixActionToExpo = (action: any): void => {
  sendMessageToExpo({
    type: 'DATAMATRIX_ACTION',
    payload: action
  });
};

/**
 * Send a navigation request to the Expo app
 */
export const sendNavigationToExpo = (navigation: { url: string; params?: Record<string, any> }): void => {
  sendMessageToExpo({
    type: 'NAVIGATE',
    payload: navigation
  });
};

/**
 * Send a notification request to the Expo app
 */
export const sendNotificationToExpo = (notification: { title: string; message: string }): void => {
  sendMessageToExpo({
    type: 'NOTIFICATION',
    payload: notification
  });
};