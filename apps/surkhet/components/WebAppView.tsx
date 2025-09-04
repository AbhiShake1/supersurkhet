import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';
import type { DataMatrixAction } from '@/components/DataMatrixTypes';

interface WebAppViewProps {
  onDataMatrixAction?: (action: DataMatrixAction) => void;
  initialUrl?: string;
}

export function WebAppView({ onDataMatrixAction, initialUrl = 'https://supersurkhet.com' }: WebAppViewProps) {
  const webViewRef = useRef<WebView>(null);

  // Handle messages from the web app
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      // Handle different message types
      switch (message.type) {
        case 'DATAMATRIX_ACTION':
          if (onDataMatrixAction) {
            onDataMatrixAction(message.payload);
          }
          break;
        case 'NAVIGATE':
          // Handle navigation requests from the web app
          console.log('Navigation request from web app:', message.payload);
          break;
        default:
          console.log('Unknown message from web app:', message);
      }
    } catch (error) {
      console.error('Failed to parse message from web app:', error);
    }
  };

  // Send a message to the web app
  const sendMessageToWebApp = (message: any) => {
    const messageString = JSON.stringify(message);
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(messageString)} }));
      true;
    `);
  };

  // Notify the web app that the device is ready
  const injectedJavaScript = `
    // Set up communication with React Native
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'DEVICE_READY',
      payload: {
        platform: 'mobile',
        appVersion: '1.0.0'
      }
    }));
    
    // Listen for messages from the web app
    window.addEventListener('message', function(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEB_TO_NATIVE',
          payload: data
        }));
      } catch (error) {
        console.error('Error processing message from web:', error);
      }
    });
    
    true;
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});