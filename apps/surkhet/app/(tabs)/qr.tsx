import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { QRScanner } from '@/components/QRScanner';
import { WifiService } from '@/components/WifiService';
import { WebAppView } from '@/components/WebAppView';
import type { DataMatrixAction } from '@/components/DataMatrixTypes';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function QRScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [showWebApp, setShowWebApp] = useState(false);
  const [navigationUrl, setNavigationUrl] = useState<string | null>(null);

  const handleCodeScanned = async (action: DataMatrixAction) => {
    setIsScanning(false);

    // Handle different action types
    if (action.action === 'wifi_connect' && action.wifi) {
      // Connect to WiFi
      const success = await WifiService.connectToWifi(
        action.wifi.ssid,
        action.wifi.password,
        action.wifi.security === 'WEP'
      );

      if (success) {
        Alert.alert('Success', `Connected to WiFi network: ${action.wifi.ssid}`);

        // Handle post-connect actions
        if (action.post_connect) {
          Alert.alert(
            action.post_connect.notification.title,
            action.post_connect.notification.message
          );
        }

        // Handle navigation after WiFi connection
        if (action.navigation) {
          setNavigationUrl(action.navigation.url);
          setShowWebApp(true);
        }

        if (action.on_complete?.type === 'navigate' && action.on_complete.url) {
          setNavigationUrl(action.on_complete.url);
          setShowWebApp(true);
        }
      } else {
        Alert.alert('Error', 'Failed to connect to WiFi network');
      }
    } else if (action.action === 'navigate' && action.navigation) {
      // Handle direct navigation
      setNavigationUrl(action.navigation.url);
      setShowWebApp(true);
    } else {
      // Handle other action types
      Alert.alert('Action Detected', `Action type: ${action.action}`);
    }
  };

  const handleDataMatrixAction = (action: DataMatrixAction) => {
    // Handle actions sent from the web app
    console.log('Received action from web app:', action);
    Alert.alert('Web App Action', `Received action: ${action.action}`);
  };

  if (showWebApp) {
    return (
      <SafeAreaView style={styles.container}>
        <WebAppView
          onDataMatrixAction={handleDataMatrixAction}
          initialUrl={navigationUrl || 'https://supersurkhet.com/'}
        />
        <View style={styles.webAppControls}>
          <Button
            title="Back to Scanner"
            onPress={() => setShowWebApp(false)}
            style={styles.controlButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        QR Scanner
      </ThemedText>

      <ThemedText style={styles.description}>
        Scan QR codes or DataMatrix codes to connect to WiFi networks or access services.
      </ThemedText>

      {!isScanning ? (
        <View style={styles.buttonContainer}>
          <Button
            title="Start Scanning"
            onPress={() => setIsScanning(true)}
            style={styles.button}
          />
        </View>
      ) : (
        <QRScanner
          onCodeScanned={handleCodeScanned}
          onClose={() => setIsScanning(false)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
  },
  description: {
    textAlign: 'center',
    marginBottom: 30,
    marginHorizontal: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    width: '80%',
    padding: 15,
  },
  webAppControls: {
    padding: 10,
    backgroundColor: '#f0f0f0',
  },
  controlButton: {
    padding: 10,
  },
});