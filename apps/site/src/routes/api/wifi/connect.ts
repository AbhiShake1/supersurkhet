import { createServerFn } from '@tanstack/react-start'
// import wifi from 'node-wifi'
import { z } from 'zod'

// Initialize wifi module
// wifi.init({
//   iface: null // Default interface
// })

// Schema for WiFi connection parameters
const wifiConnectSchema = z.object({
  ssid: z.string().min(1, 'SSID is required'),
  password: z.string().optional(),
  security: z.enum(['WPA2', 'WPA3', 'WEP', 'open']).optional()
})

// Create server function for connecting to WiFi
export const connectToWifi = createServerFn({ method: "POST" })
  .handler(async (input: unknown) => {
    return {
      success: false,
      connected: false,
      error: 'Unknown error occurred',
      ssid: 'Unknown network'
    }
    // try {
    //   // Validate input
    //   const { ssid, password, security } = wifiConnectSchema.parse(input)

    //   // Connect to the network
    //   await wifi.connect({ ssid, password })

    //   // Check connection status
    //   const currentConnections = await wifi.getCurrentConnections()
    //   const isConnected = currentConnections.some(conn => conn.ssid === ssid)

    //   return {
    //     success: true,
    //     connected: isConnected,
    //     ssid,
    //     message: isConnected ? `Successfully connected to ${ssid}` : `Connection attempt completed for ${ssid}`
    //   }
    // } catch (error) {
    //   console.error('Error connecting to WiFi:', error)
    //   return {
    //     success: false,
    //     connected: false,
    //     error: error instanceof Error ? error.message : 'Unknown error occurred',
    //     ssid: (input as any)?.ssid || 'Unknown network'
    //   }
    // }
  })