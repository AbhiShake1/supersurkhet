import { useEffect, useRef, useState } from 'react'
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import {
  Camera,
  useCameraDevice,
  useCodeScanner,
} from 'react-native-vision-camera'
import type { DataMatrixAction } from './DataMatrixTypes'
import {
  type DataMatrixNativeParserErrorCode,
  parseNativeScan,
} from './qr-scan-parser'

export type { DataMatrixNativeParserErrorCode } from './qr-scan-parser'
export { DATAMATRIX_NATIVE_PARSER_ERROR_CODES } from './qr-scan-parser'

export const DATAMATRIX_NATIVE_BRIDGE_EVENTS = {
  routeResolved: 'DATAMATRIX_SCAN_ROUTE_RESOLVED',
  deterministicMessageAppended:
    'DATAMATRIX_SCAN_DETERMINISTIC_MESSAGE_APPENDED',
  fallbackRequested: 'DATAMATRIX_SCAN_FALLBACK_REQUESTED',
  fallbackSuppressed: 'DATAMATRIX_SCAN_FALLBACK_SUPPRESSED',
} as const

export type QRScannerRouteEvent =
  | {
      lane: 'deterministic'
      eventType: typeof DATAMATRIX_NATIVE_BRIDGE_EVENTS.deterministicMessageAppended
      message: string
      action?: DataMatrixAction
      rawValue: string
      timestamp: number
    }
  | {
      lane: 'fallback'
      eventType:
        | typeof DATAMATRIX_NATIVE_BRIDGE_EVENTS.fallbackRequested
        | typeof DATAMATRIX_NATIVE_BRIDGE_EVENTS.fallbackSuppressed
      message: string
      rawValue: string
      parserErrorCode: DataMatrixNativeParserErrorCode
      timestamp: number
    }

interface QRScannerProps {
  onCodeScanned?: (action: DataMatrixAction) => void
  onRouteResolved?: (event: QRScannerRouteEvent) => void
  onClose: () => void
}

export function QRScanner({
  onCodeScanned,
  onRouteResolved,
  onClose,
}: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState(false)
  const device = useCameraDevice('back')
  const camera = useRef<Camera>(null)

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'data-matrix'],
    onCodeScanned: (codes) => {
      if (codes.length === 0) {
        return
      }

      const barcode = codes[0]
      const rawValue = barcode.value?.trim() ?? ''
      const parsedRoute = parseNativeScan(rawValue)
      if (parsedRoute.lane === 'fallback') {
        onRouteResolved?.({
          lane: 'fallback',
          eventType: parsedRoute.suppressed
            ? DATAMATRIX_NATIVE_BRIDGE_EVENTS.fallbackSuppressed
            : DATAMATRIX_NATIVE_BRIDGE_EVENTS.fallbackRequested,
          message: parsedRoute.message,
          rawValue,
          parserErrorCode: parsedRoute.parserErrorCode,
          timestamp: Date.now(),
        })
        if (parsedRoute.showInvalidJsonAlert) {
          Alert.alert(
            'Invalid QR Code',
            'The scanned QR code does not contain valid JSON data.',
          )
        }
        return
      }

      const routeEvent: QRScannerRouteEvent = {
        lane: 'deterministic',
        eventType: DATAMATRIX_NATIVE_BRIDGE_EVENTS.deterministicMessageAppended,
        message: parsedRoute.message,
        action: parsedRoute.action,
        rawValue,
        timestamp: Date.now(),
      }
      onRouteResolved?.(routeEvent)
      if (parsedRoute.action) {
        onCodeScanned?.(parsedRoute.action)
      }
    },
  })

  useEffect(() => {
    ;(async () => {
      const status = await Camera.requestCameraPermission()
      setHasPermission(status === 'granted')
    })()
  }, [])

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (device == null) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera not available.</Text>
        <TouchableOpacity style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>Close</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={camera}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
      />
      <View style={styles.overlay}>
        <View style={styles.topOverlay} />
        <View style={styles.middleOverlay}>
          <View style={styles.sideOverlay} />
          <View style={styles.scanArea} />
          <View style={styles.sideOverlay} />
        </View>
        <View style={styles.bottomOverlay}>
          <Text style={styles.instruction}>
            Point your camera at a QR code or DataMatrix
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  message: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  middleOverlay: {
    flexDirection: 'row',
    height: 250,
  },
  sideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 10,
  },
  bottomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
})
