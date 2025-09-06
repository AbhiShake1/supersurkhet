import React, { useRef } from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet, Alert, Platform } from 'react-native';
import type { DataMatrixAction } from '@/components/DataMatrixTypes';
import { QRScanner } from '@/components/QRScanner';

interface WebAppViewProps {
  onDataMatrixAction?: (action: DataMatrixAction) => void;
  onQRScannerRequest?: () => void;
  initialUrl?: string;
}

export function WebAppView({ 
  onDataMatrixAction, 
  onQRScannerRequest,
  initialUrl = 'https://supersurkhet.com' 
}: WebAppViewProps) {
  const webViewRef = useRef<WebView>(null);
  const [showQRScanner, setShowQRScanner] = React.useState(false);

  // Handle QR code scanned in native scanner
  const handleCodeScanned = (action: DataMatrixAction) => {
    setShowQRScanner(false);
    
    // Send the scanned action to the web app
    const messageString = JSON.stringify({
      type: 'DATAMATRIX_ACTION',
      payload: action
    });
    
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(messageString)} }));
      true;
    `);
    
    // Also notify the parent component
    if (onDataMatrixAction) {
      onDataMatrixAction(action);
    }
  };

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
        case 'QR_SCANNER_REQUEST':
          // Handle QR scanner request from web app
          if (onQRScannerRequest) {
            onQRScannerRequest();
          } else {
            // Default behavior: show native QR scanner
            setShowQRScanner(true);
          }
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

  // If showing QR scanner, render it instead of WebView
  if (showQRScanner) {
    return (
      <View>
        <QRScanner 
          onCodeScanned={handleCodeScanned} 
          onClose={() => setShowQRScanner(false)} 
        />
      </View>
    );
  }

  return (
    <View>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
      />
    </View>
  );
}