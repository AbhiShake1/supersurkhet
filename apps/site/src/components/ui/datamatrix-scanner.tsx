import { Scanner as QrScanner } from '@yudiel/react-qr-scanner';
import {
  Camera,
  Database,
  Pause,
  Play,
  QrCode,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DataMatrixAction } from '@/lib/datamatrix';
import {
  evaluateLocationDwell,
  type LocationDwellPolicyInput,
  type LocationSampleLike,
} from '@/lib/datamatrix/location-dwell';
import {
  createScanRouter,
  type ScanRouteFallbackResult,
  type ScanRouterOptions,
} from '@/lib/datamatrix/scan-router';
import {
  createVisionFallbackState,
  type VisionFallbackResponse,
} from '@/lib/datamatrix/vision-fallback';
import { runDataMatrixVisionFallback } from '@/server-functions/datamatrix-vision';

interface ScannerProps {
  onActionDetected?: (action: DataMatrixAction) => void;
  onFallbackRouted?: (result: ScanRouteFallbackResult) => void;
  verifySignedToken?: ScanRouterOptions['verifySignedToken'];
  showControls?: boolean;
  showManualInput?: boolean;
  showScanResults?: boolean;
}

const MAX_LOCATION_SAMPLES = 24;
const GEOLOCATION_TIMEOUT_MS = 2_500;
const GEOLOCATION_MAX_AGE_MS = 5_000;

function asLocationDwellPolicyInput(
  value: unknown,
): LocationDwellPolicyInput | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }
  return value as LocationDwellPolicyInput;
}

async function captureLocationSample(): Promise<LocationSampleLike | null> {
  if (
    typeof navigator === 'undefined' ||
    !('geolocation' in navigator) ||
    !navigator.geolocation
  ) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters:
            typeof position.coords.accuracy === 'number' &&
            Number.isFinite(position.coords.accuracy)
              ? position.coords.accuracy
              : null,
          timestampMs:
            typeof position.timestamp === 'number' &&
            Number.isFinite(position.timestamp)
              ? position.timestamp
              : Date.now(),
          source: 'web_geolocation',
        });
      },
      () => resolve(null),
      {
        enableHighAccuracy: true,
        timeout: GEOLOCATION_TIMEOUT_MS,
        maximumAge: GEOLOCATION_MAX_AGE_MS,
      },
    );
  });
}

function isVisionFallbackResponse(
  value: unknown,
): value is VisionFallbackResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.route === 'vision_fallback' &&
    typeof candidate.status === 'string' &&
    typeof candidate.summary === 'string'
  );
}

export function DataMatrixScanner({
  onActionDetected,
  onFallbackRouted,
  verifySignedToken,
  showControls = true,
  showManualInput = true,
  showScanResults = true,
}: ScannerProps) {
  const [isScanning, setIsScanning] = useState(true);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [parsedAction, setParsedAction] = useState<DataMatrixAction | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [agentMessage, setAgentMessage] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const onActionDetectedRef = useRef(onActionDetected);
  const onFallbackRoutedRef = useRef(onFallbackRouted);
  const scanSessionIdRef = useRef(
    `web-scan-session-${Math.random().toString(36).slice(2, 10)}`,
  );
  const locationSamplesRef = useRef<LocationSampleLike[]>([]);
  const visionFallbackStateRef = useRef(createVisionFallbackState());
  onActionDetectedRef.current = onActionDetected;
  onFallbackRoutedRef.current = onFallbackRouted;

  const evaluateLocation: ScanRouterOptions['evaluateLocation'] = async (
    payload,
  ) => {
    const sample = await captureLocationSample();
    if (sample) {
      locationSamplesRef.current = [
        ...locationSamplesRef.current.slice(-(MAX_LOCATION_SAMPLES - 1)),
        sample,
      ];
    }

    const decision = evaluateLocationDwell({
      samples: locationSamplesRef.current,
      engineDefinition: {
        engineId: payload.engineId,
        locationPolicy: asLocationDwellPolicyInput(payload.locationPolicy),
      },
    });

    return {
      status: decision.status,
      reason:
        decision.reasons.length > 0
          ? decision.reasons.join(',')
          : `location-${decision.status}`,
      shouldProceed: decision.shouldProceed,
      executionMode: decision.executionMode,
      confidence: decision.confidence,
      reasons: decision.reasons,
    };
  };

  const scanRouterRef = useRef(
    createScanRouter({
      verifySignedToken:
        verifySignedToken ??
        (({ signature }) => {
          return signature.trim().length > 0;
        }),
      evaluateLocation,
      appendAgentMessage: (message) => {
        setAgentMessage(message);
      },
      invokeFallbackAi: async (input) => {
        try {
          const visionOutcome = await runDataMatrixVisionFallback({
            data: {
              sessionId: scanSessionIdRef.current,
              scanAttemptId: input.routeId,
              scanPayload: input.rawScan,
              occurredAt: Date.now(),
              providerPreference: 'auto',
              state: visionFallbackStateRef.current,
            },
          });
          visionFallbackStateRef.current = visionOutcome.state;
          return visionOutcome.response;
        } catch (error) {
          console.error('Vision fallback invocation failed:', error);
          return {
            route: 'vision_fallback',
            sessionId: scanSessionIdRef.current,
            scanAttemptId: input.routeId,
            scanHash: input.dedupeKey,
            status: 'failed',
            providerTag: null,
            providerId: null,
            reason: 'provider_error',
            summary: 'Vision fallback invocation failed at runtime.',
            payload: null,
            upload: {
              performed: false,
              reused: false,
              uploadId: null,
            },
            attempts: [],
            occurredAt: Date.now(),
          } satisfies VisionFallbackResponse;
        }
      },
      maxFallbackAiCalls: 3,
      dedupeWindowMs: 45_000,
    }),
  );

  // Handle scan result
  const handleScan = async (result: string) => {
    if (!result) return;

    setScannedData(result);
    try {
      const route = await scanRouterRef.current.routeScan(result, {
        source: 'web_scanner',
        sessionId: scanSessionIdRef.current,
      });

      if (route.lane === 'deterministic') {
        setError(null);
        setParsedAction(route.action ?? null);
        if (route.action) {
          onActionDetectedRef.current?.(route.action);
        }
        if (route.outcome === 'blocked_location') {
          toast.error('Deterministic scan waiting for stable location.');
        } else if (route.location.status !== 'stable') {
          toast.success('Deterministic scan routed in partial location mode.');
        } else {
          toast.success('Deterministic scan routed.');
        }
        return;
      }

      setParsedAction(null);
      setAgentMessage(null);
      setError(
        `Fallback lane (${route.outcome}): ${route.parserErrorCode.replaceAll('_', ' ')}`,
      );
      const visionResponse = isVisionFallbackResponse(route.fallbackResponse)
        ? route.fallbackResponse
        : null;
      if (visionResponse?.summary) {
        setAgentMessage(visionResponse.summary);
      }
      onFallbackRoutedRef.current?.(route);
      if (route.outcome === 'ai_invoked') {
        if (visionResponse?.status === 'resolved') {
          toast.success('Fallback AI resolved scan content.');
        } else if (visionResponse?.status === 'blocked') {
          setError(
            `Fallback lane blocked by policy (${visionResponse.reason ?? 'unknown_reason'}).`,
          );
          toast.error('Fallback AI blocked by budget policy.');
        } else if (visionResponse?.status === 'failed') {
          setError(
            `Fallback lane failed (${visionResponse.reason ?? 'provider_error'}).`,
          );
          toast.error('Fallback AI provider failed to resolve this scan.');
        } else {
          toast.success('Fallback AI routing triggered.');
        }
      } else if (route.outcome === 'suppressed_deduped') {
        toast.error('Duplicate scan suppressed to avoid repeated AI calls.');
      } else if (route.outcome === 'suppressed_budget') {
        toast.error('Fallback AI budget reached for this scan session.');
      } else {
        toast.error(
          'Fallback routing available but AI path is not configured.',
        );
      }
    } catch (error) {
      console.error('Scan routing failed:', error);
      setParsedAction(null);
      setError('Failed to route scanned data. Please try again.');
      toast.error('Scan routing failed');
    }
  };

  // Handle manual input submission
  const handleSubmitManualInput = () => {
    if (manualInput.trim()) {
      void handleScan(manualInput);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setScannedData(null);
    setParsedAction(null);
    setError(null);
    setAgentMessage(null);
    setManualInput('');
    locationSamplesRef.current = [];
    visionFallbackStateRef.current = createVisionFallbackState();
    scanRouterRef.current.resetBudgets();
  };

  return (
    <div className="space-y-6">
      {/* Scanner View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            DataMatrix Scanner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isScanning ? (
              <div className="relative rounded-lg overflow-hidden border">
                <QrScanner
                  onScan={(result) => {
                    void handleScan(result[0]?.rawValue || '');
                  }}
                  onError={(err) => {
                    console.error('Scanner error:', err);
                    setError(
                      'Failed to access camera. Please check permissions.',
                    );
                  }}
                  formats={['qr_code', 'data_matrix']}
                  // className="w-full aspect-square"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-white rounded-lg w-64 h-64" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-muted rounded-lg">
                <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Scanner is paused</p>
              </div>
            )}

            {showControls && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setIsScanning(!isScanning)}
                  variant={isScanning ? 'secondary' : 'default'}
                >
                  {isScanning ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Scanner
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Start Scanner
                    </>
                  )}
                </Button>

                <Button onClick={resetScanner} variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Input */}
      {showManualInput && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Manual Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="manualInput">Action Data (JSON)</Label>
                {/** biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup */}
                <Textarea
                  id="manualInput"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder='Paste JSON action data here: {"version": "1.0", "action": "wifi_connect", ...}'
                  rows={6}
                />
              </div>
              <Button onClick={handleSubmitManualInput} className="w-full">
                Process Action Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan Results */}
      {showScanResults && scannedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {parsedAction ? (
                <QrCode className="h-5 w-5 text-green-500" />
              ) : (
                <Database className="h-5 w-5 text-red-500" />
              )}
              Scan Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-100 text-red-800 rounded-md">
                  {error}
                </div>
              )}
              {agentMessage && (
                <div className="p-3 bg-blue-100 text-blue-900 rounded-md">
                  {agentMessage}
                </div>
              )}

              {parsedAction ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-100 rounded-md">
                    <span className="font-medium">Valid Action Detected</span>
                    <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                      {parsedAction.action}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Action Details</h4>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span>{parsedAction.version}</span>
                      </div>

                      {parsedAction.wifi && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              WiFi Network
                            </span>
                            <span>{parsedAction.wifi.ssid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Security
                            </span>
                            <span>{parsedAction.wifi.security}</span>
                          </div>
                        </div>
                      )}

                      {parsedAction.navigation && (
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Navigation URL
                            </span>
                            <span className="truncate max-w-[150px]">
                              {parsedAction.navigation.url}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Raw Data</h4>
                    <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                      {JSON.stringify(parsedAction, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-2">Scanned Data</h4>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {scannedData}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
