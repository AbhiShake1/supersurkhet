import WifiManager from 'react-native-wifi-reborn';
import { Platform, PermissionsAndroid } from 'react-native';

// biome-ignore lint/complexity/noStaticOnlyClass: <explanation>
export class WifiService {
  static async requestLocationPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location permission is required for WiFi connections',
            message: 'This app needs location permission to scan for WiFi networks.',
            buttonNegative: 'DENY',
            buttonPositive: 'ALLOW',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true; // iOS doesn't require this permission
  }

  static async connectToWifi(ssid: string, password: string, isWep = false, isHidden = false): Promise<boolean> {
    try {
      // Request location permission for Android
      const hasPermission = await WifiService.requestLocationPermission();
      if (!hasPermission && Platform.OS === 'android') {
        throw new Error('Location permission is required to connect to WiFi');
      }

      // Connect to the WiFi network
      await WifiManager.connectToProtectedSSID(ssid, password, isWep, isHidden);
      return true;
    } catch (error) {
      console.error('Failed to connect to WiFi:', error);
      return false;
    }
  }

  static async getCurrentWifiSSID(): Promise<string | null> {
    try {
      const ssid = await WifiManager.getCurrentWifiSSID();
      return ssid;
    } catch (error) {
      console.error('Failed to get current WiFi SSID:', error);
      return null;
    }
  }

  static async isConnectedToWifi(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        return await WifiManager.connectionStatus();
      }

      // For iOS, we'll check if we can get the current SSID
      // biome-ignore lint/complexity/noThisInStatic: <explanation>
      const ssid = await this.getCurrentWifiSSID();
      return ssid !== null;

    } catch (error) {
      console.error('Failed to check WiFi connection status:', error);
      return false;
    }
  }
}