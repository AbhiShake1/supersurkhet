# Offline Support Implementation for SuperSurkhet Expo App

## Overview

This document describes the implementation of offline support for the SuperSurkhet Expo app, enabling users to:
1. Scan QR codes while offline
2. Connect to WiFi networks using QR code data
3. Navigate to URLs within the app after connecting to WiFi

## Components Implemented

### 1. WiFi Connectivity (Expo App)
- **Library**: `react-native-wifi-reborn`
- **Features**:
  - Connect to protected WiFi networks
  - Check current WiFi connection status
  - Request necessary permissions (Android location permission)

### 2. QR Scanning (Expo App)
- **Libraries**: `react-native-vision-camera` and `vision-camera-code-scanner`
- **Features**:
  - Scan QR codes and DataMatrix codes
  - Parse JSON data from scanned codes
  - Handle different action types (WiFi connect, navigation, etc.)

### 3. WebView Communication (Expo App ↔ Web App)
- **Library**: `react-native-webview`
- **Features**:
  - Bidirectional communication using `postMessage`
  - Launch URLs within the app after WiFi connection
  - Handle actions sent from the web app

### 4. Offline Support (Web App)
- **Technology**: Service Workers
- **Features**:
  - Cache essential app files for offline access
  - Serve cached content when offline
  - Clean up old caches during updates

## Implementation Details

### Expo App Structure
- Added QR scanner tab with camera-based scanning
- Created WiFi service for network connectivity
- Implemented WebView for in-app navigation
- Added necessary permissions in `app.json`

### Web App Structure
- Added service worker (`sw.js`) for offline caching
- Registered service worker in `client.tsx`
- Added web app manifest for PWA support
- Updated root route to handle DataMatrix actions

## Testing

To test the offline workflow:

1. Generate a QR code with WiFi connection data:
   ```json
   {
     "version": "1.0",
     "action": "wifi_connect",
     "wifi": {
       "ssid": "SuperSurkhet-Guest",
       "password": "Welcome123",
       "security": "WPA2"
     },
     "post_connect": {
       "notification": {
         "title": "Connected Successfully",
         "message": "You're now connected to SuperSurkhet-Guest WiFi"
       }
     },
     "navigation": {
       "url": "https://supersurkhet.com/welcome"
     },
     "on_complete": {
       "type": "navigate",
       "url": "https://supersurkhet.com/dashboard"
     }
   }
   ```

2. Open the Expo app and navigate to the QR Scanner tab
3. Scan the QR code
4. The app will connect to the WiFi network
5. After connection, the app will navigate to the specified URL within a WebView

## Limitations

1. **Expo Go**: This implementation requires a custom development build, not Expo Go, due to native dependencies
2. **iOS Limitations**: iOS has stricter requirements for WiFi connectivity (requires specific entitlements)
3. **Android Permissions**: Android requires location permission for WiFi scanning
4. **Web Limitations**: Web browsers cannot directly connect to WiFi networks, only provide instructions

## Future Enhancements

1. Add offline data storage using SQLite or AsyncStorage
2. Implement background sync when connection is restored
3. Add more action types for different QR code scenarios
4. Improve error handling and user feedback
5. Add support for Bluetooth-based actions (e.g., equipment control)