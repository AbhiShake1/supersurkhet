import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { scanWifiNetworks, connectToWifi } from '../routes/api/wifi'

// Custom hook for WiFi functionality
export const useWifiNetworks = () => {
  const queryClient = useQueryClient()

  // Query for scanning WiFi networks
  const {
    data: wifiScanResult,
    error: wifiScanError,
    isLoading: isScanning,
    refetch: scanNetworks,
    isError: isScanError
  } = useQuery({
    queryKey: ['wifi-networks'],
    queryFn: scanWifiNetworks,
    enabled: false, // Don't auto-run, only when requested
    staleTime: 30000, // 30 seconds
    gcTime: 60000 // 1 minute
  })

  // Mutation for connecting to WiFi
  const {
    mutate: connectToNetwork,
    data: connectResult,
    error: connectError,
    isPending: isConnecting,
    isSuccess: isConnectSuccess,
    isError: isConnectError
  } = useMutation({
    mutationFn: connectToWifi,
    onSuccess: () => {
      // Invalidate and refetch networks after successful connection
      queryClient.invalidateQueries({ queryKey: ['wifi-networks'] })
    }
  })

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
    isLoading: isScanning || isConnecting
  }
}