import { createServerFn } from '@tanstack/react-start'
// import wifi from 'node-wifi'

// Initialize wifi module
// wifi.init({
//   iface: null // Default interface
// })

// Create server function for scanning WiFi networks
export const scanWifiNetworks = createServerFn({ method: "GET" })
  .handler(async () => {
    return {
      success: false,
      error: 'Unknown error occurred',
      networks: []
    }
    // try {
    //   // Scan for WiFi networks
    //   const networks = await wifi.scan()

    //   // Transform the data to match our UI needs
    //   const formattedNetworks = networks.map(network => ({
    //     ssid: network.ssid,
    //     security: network.security,
    //     signalLevel: network.signal_level,
    //     quality: network.quality
    //   }))

    //   return {
    //     success: true,
    //     networks: formattedNetworks,
    //     timestamp: new Date().toISOString()
    //   }
    // } catch (error) {
    //   console.error('Error scanning WiFi networks:', error)
    //   return {
    //     success: false,
    //     error: error instanceof Error ? error.message : 'Unknown error occurred',
    //     networks: []
    //   }
    // }
  })