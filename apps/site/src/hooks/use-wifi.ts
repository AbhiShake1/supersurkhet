import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type WifiNetwork = {
  ssid: string;
  security: string;
  signalStrength?: number;
  isConnected?: boolean;
};

export type WifiScanResult = {
  success: boolean;
  networks: WifiNetwork[];
};

export type WifiConnectInput = {
  ssid: string;
  password?: string;
  security?: string;
};

export type WifiConnectResult = {
  success: boolean;
  ssid: string;
};

async function scanWifiNetworks(): Promise<WifiScanResult> {
  return {
    success: true,
    networks: [
      { ssid: 'HomeNetwork', security: 'WPA2', signalStrength: 82 },
      { ssid: 'OfficeWiFi', security: 'WPA3', signalStrength: 74 },
      { ssid: 'CoffeeShop-Guest', security: 'open', signalStrength: 61 },
    ],
  };
}

async function connectToWifi(
  input: WifiConnectInput,
): Promise<WifiConnectResult> {
  return {
    success: true,
    ssid: input.ssid,
  };
}

// Custom hook for WiFi functionality
export const useWifiNetworks = () => {
  const queryClient = useQueryClient();

  // Query for scanning WiFi networks
  const {
    data: wifiScanResult,
    error: wifiScanError,
    isLoading: isScanning,
    refetch: scanNetworks,
    isError: isScanError,
  } = useQuery({
    queryKey: ['wifi-networks'],
    queryFn: scanWifiNetworks,
    enabled: false, // Don't auto-run, only when requested
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  // Mutation for connecting to WiFi
  const {
    mutate: connectToNetwork,
    data: connectResult,
    error: connectError,
    isPending: isConnecting,
    isSuccess: isConnectSuccess,
    isError: isConnectError,
  } = useMutation({
    mutationFn: connectToWifi,
    onSuccess: () => {
      // Invalidate and refetch networks after successful connection
      queryClient.invalidateQueries({ queryKey: ['wifi-networks'] });
    },
  });

  return {
    // Scan related
    wifiScanResult,
    wifiScanError,
    isScanning,
    scanNetworks,
    isScanError,

    // Connect related
    connectToNetwork,
    connectResult,
    connectError,
    isConnecting,
    isConnectSuccess,
    isConnectError,

    // Combined status
    isLoading: isScanning || isConnecting,
  };
};
