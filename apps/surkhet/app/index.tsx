import React from 'react';
import { View, StyleSheet, Button, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';
import { useConfig } from '@/contexts/ConfigContext';
import { ConfigDialog } from '@/components/ConfigDialog';

export default function HomeScreen() {
  const { websiteUrl, showConfigDialog } = useConfig();

  const isDevelopment = __DEV__;

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
        source={{ uri: websiteUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
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