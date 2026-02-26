import React, { useRef } from 'react'
import { Platform, View } from 'react-native'
import { WebView } from 'react-native-webview'
import type { DataMatrixAction } from '@/components/DataMatrixTypes'
import {
  DATAMATRIX_NATIVE_BRIDGE_EVENTS,
  QRScanner,
  type QRScannerRouteEvent,
} from '@/components/QRScanner'

const DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION = '2026-02-26' as const
const DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE =
  'DATAMATRIX_DEVICE_CALLBACK' as const
const WEB_TO_NATIVE_MESSAGE_TYPES = [
  'DATAMATRIX_ACTION',
  'NAVIGATE',
  'NOTIFICATION',
  'QR_SCANNER_REQUEST',
] as const

type DataMatrixActionRuntime = {
  runId: string
  stepId: string
  attempt: number
  callbackId?: string
  idempotencyKey?: string
  context?: DataMatrixCallbackContext
}

type DataMatrixCallbackContext = {
  businessId?: string
  workflowId?: string
  schedulerId?: string
  queueJobId?: string
}

type DataMatrixActionBridgePayload = {
  action: DataMatrixAction
  runtime?: DataMatrixActionRuntime
}

type DataMatrixDeviceCallbackPayload = {
  schemaVersion: typeof DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION
  runId: string
  stepId: string
  attempt: number
  callbackId: string
  callbackAt: string
  idempotencyKey: string
  status: 'completed' | 'failed'
  runtime: {
    bridge: 'expo-webview'
    platform: 'ios' | 'android' | 'web'
    appVersion?: string
  }
  context?: DataMatrixCallbackContext
  result?: Record<string, unknown>
  error?: {
    code: string
    message: string
    retryable: boolean
  }
}

type BridgeMessageEnvelope = {
  type: string
  payload?: unknown
}

interface WebAppViewProps {
  onDataMatrixAction?: (action: DataMatrixAction) => Promise<unknown> | unknown
  onQRScannerRequest?: () => void
  initialUrl?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isWebToNativeMessageType(
  value: string,
): value is (typeof WEB_TO_NATIVE_MESSAGE_TYPES)[number] {
  return (WEB_TO_NATIVE_MESSAGE_TYPES as readonly string[]).includes(value)
}

function toPositiveInt(value: unknown, fallback = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  const rounded = Math.trunc(value)
  return rounded > 0 ? rounded : fallback
}

function isDataMatrixAction(value: unknown): value is DataMatrixAction {
  return (
    isRecord(value) &&
    typeof value.version === 'string' &&
    typeof value.action === 'string'
  )
}

function parseDataMatrixCallbackContext(
  value: unknown,
): DataMatrixCallbackContext | undefined {
  if (!isRecord(value)) {
    return undefined
  }
  const context: DataMatrixCallbackContext = {}
  if (typeof value.businessId === 'string' && value.businessId.trim().length) {
    context.businessId = value.businessId
  }
  if (typeof value.workflowId === 'string' && value.workflowId.trim().length) {
    context.workflowId = value.workflowId
  }
  if (
    typeof value.schedulerId === 'string' &&
    value.schedulerId.trim().length > 0
  ) {
    context.schedulerId = value.schedulerId
  }
  if (typeof value.queueJobId === 'string' && value.queueJobId.trim().length) {
    context.queueJobId = value.queueJobId
  }
  if (Object.keys(context).length === 0) {
    return undefined
  }
  return context
}

function parseDataMatrixActionRuntime(
  value: unknown,
): DataMatrixActionRuntime | null {
  if (!isRecord(value)) {
    return null
  }

  if (typeof value.runId !== 'string' || typeof value.stepId !== 'string') {
    return null
  }

  const callbackId =
    typeof value.callbackId === 'string' && value.callbackId.trim().length > 0
      ? value.callbackId
      : undefined
  const idempotencyKey =
    typeof value.idempotencyKey === 'string' &&
    value.idempotencyKey.trim().length > 0
      ? value.idempotencyKey
      : undefined
  const context = parseDataMatrixCallbackContext(value.context)

  return {
    runId: value.runId,
    stepId: value.stepId,
    attempt: toPositiveInt(value.attempt, 1),
    callbackId,
    idempotencyKey,
    context,
  }
}

function parseDataMatrixActionPayload(
  value: unknown,
): DataMatrixActionBridgePayload | null {
  if (isDataMatrixAction(value)) {
    return { action: value }
  }

  if (!isRecord(value) || !isDataMatrixAction(value.action)) {
    return null
  }

  let runtime: DataMatrixActionRuntime | undefined
  if ('runtime' in value) {
    const parsedRuntime = parseDataMatrixActionRuntime(value.runtime)
    if (!parsedRuntime) {
      return null
    }
    runtime = parsedRuntime
  }

  return {
    action: value.action,
    runtime,
  }
}

function parseBridgeMessage(value: unknown): BridgeMessageEnvelope | null {
  const decoded =
    typeof value === 'string'
      ? (() => {
          try {
            return JSON.parse(value) as unknown
          } catch {
            return null
          }
        })()
      : value

  if (!isRecord(decoded) || typeof decoded.type !== 'string') {
    return null
  }

  return {
    type: decoded.type,
    payload: decoded.payload,
  }
}

function unwrapWebToNativeMessage(
  message: BridgeMessageEnvelope,
): BridgeMessageEnvelope {
  if (message.type !== 'WEB_TO_NATIVE') {
    return message
  }
  const nested = parseBridgeMessage(message.payload)
  return nested ?? message
}

function toKeySegment(value: string) {
  const normalized = value.trim().replace(/\s+/g, '_')
  return normalized
    .replace(/[^a-zA-Z0-9._:-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function buildCallbackIdempotencyKey(input: {
  runId: string
  stepId: string
  attempt: number
  callbackId: string
}) {
  return [
    'dm2',
    toKeySegment(input.runId),
    toKeySegment(input.stepId),
    String(Math.max(1, input.attempt)),
    toKeySegment(input.callbackId),
  ].join(':')
}

function toPlatform(): 'ios' | 'android' | 'web' {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }
  return 'Action execution failed in native bridge runtime.'
}

export function WebAppView({
  onDataMatrixAction,
  onQRScannerRequest,
  initialUrl = 'https://supersurkhet.com/',
}: WebAppViewProps) {
  const webViewRef = useRef<WebView>(null)
  const [showQRScanner, setShowQRScanner] = React.useState(false)

  const sendMessageToWebApp = (message: BridgeMessageEnvelope) => {
    const messageString = JSON.stringify(message)
    webViewRef.current?.injectJavaScript(`
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(messageString)} }));
      true;
    `)
  }

  const emitDataMatrixDeviceCallback = (
    payload: DataMatrixDeviceCallbackPayload,
  ) => {
    sendMessageToWebApp({
      type: DATAMATRIX_DEVICE_CALLBACK_MESSAGE_TYPE,
      payload,
    })
  }

  const buildDeviceCallbackPayload = (args: {
    payload: DataMatrixActionBridgePayload
    status: DataMatrixDeviceCallbackPayload['status']
    result?: Record<string, unknown>
    error?: DataMatrixDeviceCallbackPayload['error']
  }): DataMatrixDeviceCallbackPayload => {
    const callbackAt = new Date().toISOString()
    const runId =
      args.payload.runtime?.runId ?? `adhoc-run-${Date.now().toString(36)}`
    const stepId =
      args.payload.runtime?.stepId ?? `action.${args.payload.action.action}`
    const attempt = args.payload.runtime?.attempt ?? 1
    const callbackId =
      args.payload.runtime?.callbackId ?? `${stepId}.${Date.now().toString(36)}`
    const idempotencyKey =
      args.payload.runtime?.idempotencyKey ??
      buildCallbackIdempotencyKey({
        runId,
        stepId,
        attempt,
        callbackId,
      })

    return {
      schemaVersion: DATAMATRIX_DEVICE_CALLBACK_SCHEMA_VERSION,
      runId,
      stepId,
      attempt,
      callbackId,
      callbackAt,
      idempotencyKey,
      status: args.status,
      runtime: {
        bridge: 'expo-webview',
        platform: toPlatform(),
      },
      context: args.payload.runtime?.context,
      result: args.result,
      error: args.error,
    }
  }

  const handleDataMatrixBridgeAction = async (
    payload: DataMatrixActionBridgePayload,
  ) => {
    try {
      const result = await onDataMatrixAction?.(payload.action)
      const resultPayload =
        isRecord(result) && Object.keys(result).length > 0 ? result : undefined

      emitDataMatrixDeviceCallback(
        buildDeviceCallbackPayload({
          payload,
          status: 'completed',
          result: resultPayload,
        }),
      )
    } catch (error) {
      emitDataMatrixDeviceCallback(
        buildDeviceCallbackPayload({
          payload,
          status: 'failed',
          error: {
            code: 'native_action_failed',
            message: toErrorMessage(error),
            retryable: true,
          },
        }),
      )
    }
  }

  // Handle QR code scanned in native scanner
  const handleCodeScanned = (scanEvent: QRScannerRouteEvent) => {
    setShowQRScanner(false)

    sendMessageToWebApp({
      type: DATAMATRIX_NATIVE_BRIDGE_EVENTS.routeResolved,
      payload: scanEvent,
    })

    sendMessageToWebApp({
      type: scanEvent.eventType,
      payload: scanEvent,
    })

    if (scanEvent.lane !== 'deterministic' || !scanEvent.action) {
      return
    }

    sendMessageToWebApp({
      type: 'DATAMATRIX_ACTION',
      payload: scanEvent.action,
    })

    // Also notify the parent component
    if (onDataMatrixAction) {
      void onDataMatrixAction(scanEvent.action)
    }
  }

  // Handle messages from the web app
  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    const parsed = parseBridgeMessage(event.nativeEvent.data)
    if (!parsed) {
      console.warn('Ignored malformed message from web app')
      return
    }

    const message = unwrapWebToNativeMessage(parsed)
    if (!isWebToNativeMessageType(message.type)) {
      console.log(
        'Ignored unsupported message type from web app:',
        message.type,
      )
      return
    }

    switch (message.type) {
      case 'DATAMATRIX_ACTION': {
        const payload = parseDataMatrixActionPayload(message.payload)
        if (!payload) {
          console.warn(
            'Ignored DATAMATRIX_ACTION message with invalid payload shape',
          )
          return
        }
        void handleDataMatrixBridgeAction(payload)
        break
      }
      case 'NAVIGATE':
        // Handle navigation requests from the web app
        console.log('Navigation request from web app:', message.payload)
        break
      case 'QR_SCANNER_REQUEST':
        // Handle QR scanner requests from the web app
        if (onQRScannerRequest) {
          onQRScannerRequest()
        } else {
          setShowQRScanner(true)
        }
        break
    }
  }

  // Notify the web app that the device is ready
  const injectedJavaScript = `
    // Set up communication with React Native
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'DEVICE_READY',
      payload: {
        platform: 'mobile',
        appVersion: '1.0.0'
      }
    }));
    
    // Listen for messages from the web app
    const __dm2AllowedWebToNativeTypes = ${JSON.stringify(
      WEB_TO_NATIVE_MESSAGE_TYPES,
    )};
    window.addEventListener('message', function(event) {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data || typeof data !== 'object' || typeof data.type !== 'string') {
          return;
        }
        if (!__dm2AllowedWebToNativeTypes.includes(data.type)) {
          return;
        }
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'WEB_TO_NATIVE',
          payload: data
        }));
      } catch (error) {
        console.error('Error processing message from web:', error);
      }
    });
    
    true;
  `

  // If showing QR scanner, render it instead of WebView
  if (showQRScanner) {
    return (
      <View>
        <QRScanner
          onRouteResolved={handleCodeScanned}
          onClose={() => setShowQRScanner(false)}
        />
      </View>
    )
  }

  return (
    <View>
      <WebView
        ref={webViewRef}
        source={{ uri: initialUrl }}
        onMessage={handleWebViewMessage}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        mediaPlaybackRequiresUserAction={Platform.OS === 'ios'}
      />
    </View>
  )
}
