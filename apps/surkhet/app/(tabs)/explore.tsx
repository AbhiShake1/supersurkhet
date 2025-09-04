import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.container}>
      <ThemedView style={styles.main}>
        <ThemedText type="title" style={styles.title}>
          SuperSurkhet App
        </ThemedText>
        
        <ThemedText style={styles.description}>
          This is the official SuperSurkhet mobile application. It provides a seamless 
          experience for interacting with local businesses, services, and community features.
        </ThemedText>
        
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Key Features
          </ThemedText>
          <ThemedText style={styles.feature}>
            • QR/DataMatrix scanning for quick actions
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Automatic WiFi connection
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Location-based services
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Push notifications
          </ThemedText>
          <ThemedText style={styles.feature}>
            • Multi-step bidirectional interactions
          </ThemedText>
        </ThemedView>
        
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            How It Works
          </ThemedText>
          <ThemedText style={styles.description}>
            Simply scan QR codes or DataMatrix codes found throughout Surkhet to 
            access various services and features. The app will automatically handle 
            connections, notifications, and other interactions.
          </ThemedText>
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  main: {
    flex: 1,
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    marginBottom: 15,
    lineHeight: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    marginBottom: 10,
  },
  feature: {
    marginBottom: 8,
    marginLeft: 10,
  },
});