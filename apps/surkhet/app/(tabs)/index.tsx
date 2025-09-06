import React, { useState, useRef } from 'react';
import { View, StyleSheet, Button, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { useConfig } from '@/contexts/ConfigContext';
import { ConfigDialog } from '@/components/ConfigDialog';
import { QRScanner } from '@/components/QRScanner';
import type { DataMatrixAction } from '@/components/DataMatrixTypes';

export default function HomeScreen() {
  const { websiteUrl, showConfigDialog } = useConfig();
  const [isScanning, setIsScanning] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const isDevelopment = __DEV__;

  const handleCodeScanned = (action: DataMatrixAction) => {
    setIsScanning(false);
    const messageString = JSON.stringify({
      type: 'DATAMATRIX_ACTION',
      payload: action
    });
    
    webViewRef.current?.injectJavaScript(`
      window.postMessage(${messageString}, '*');
      true;
    `);
  };

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'QR_SCANNER_REQUEST') {
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Failed to parse message from web app:', error);
    }
  };

  if (isScanning) {
    return (
      <QRScanner
        onCodeScanned={handleCodeScanned}
        onClose={() => setIsScanning(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {isDevelopment && (
        <View style={styles.devButtonContainer}>
          <Button 
            title="Config" 
            onPress={showConfigDialog}
            color="#0a7ea4"
          />
        </View>
      )}
      
      <WebView
        ref={webViewRef}
        source={{ uri: websiteUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        onMessage={handleWebViewMessage}
        mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
      />
      
      <ConfigDialog />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  devButtonContainer: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  webview: {
    flex: 1,
  },
});