'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DataMatrixScanner } from '@/components/ui/datamatrix-scanner';
import { ActionExecutor } from '@/lib/datamatrix/action-executor';
import type { DataMatrixAction } from '@/lib/schema';
import { Camera, Database, RotateCcw, Scan, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function DataMatrixClientPage() {
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [executionState, setExecutionState] = useState<
    'idle' | 'executing' | 'completed' | 'error'
  >('idle');
  const [currentAction, setCurrentAction] = useState<DataMatrixAction | null>(
    null,
  );

  const handleActionDetected = (action: DataMatrixAction) => {
    setCurrentAction(action);

    // Execute the action progressively
    const executor = new ActionExecutor(action);

    executor.onProgress((state) => {
      console.log('Action progress:', state);
      // Update UI based on progress if needed
    });

    executor.onError((error) => {
      setExecutionState('error');
      toast.error(`Action execution failed: ${error.message}`);
    });

    // Start execution
    setExecutionState('executing');

    executor
      .execute()
      .then(() => {
        setExecutionState('completed');
        toast.success('Action completed successfully!');
      })
      .catch((error) => {
        // Error already handled by executor
        setExecutionState('error');
        console.error('Action execution failed:', error);
      });
  };

  const resetScanner = () => {
    setExecutionState('idle');
    setCurrentAction(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
            <Scan className="h-8 w-8 text-primary" />
            DataMatrix Scanner
          </h1>
          <p className="text-muted-foreground mt-2">
            Scan DataMatrix or QR codes to interact with businesses and services
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Scanner Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Scan Code
              </CardTitle>
              <CardDescription>
                Point your camera at a DataMatrix or QR code to begin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataMatrixScanner onActionDetected={handleActionDetected} />
            </CardContent>
          </Card>

          {/* Action Execution Status */}
          {currentAction && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {executionState === 'executing' ? (
                    <div className="h-5 w-5 rounded-full bg-yellow-500 animate-pulse" />
                  ) : executionState === 'completed' ? (
                    <div className="h-5 w-5 rounded-full bg-green-500" />
                  ) : executionState === 'error' ? (
                    <div className="h-5 w-5 rounded-full bg-red-500" />
                  ) : (
                    <Database className="h-5 w-5" />
                  )}
                  Action Status
                </CardTitle>
                <CardDescription>
                  {executionState === 'executing' &&
                    'Executing action progressively...'}
                  {executionState === 'completed' &&
                    'Action completed successfully!'}
                  {executionState === 'error' && 'Action execution failed'}
                  {executionState === 'idle' && 'Ready to execute action'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-md bg-muted">
                    <span className="font-medium">Action Type</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-sm">
                      {currentAction.action}
                    </span>
                  </div>

                  {currentAction.wifi && (
                    <div className="space-y-2 p-3 rounded-md bg-muted">
                      <div className="font-medium flex items-center gap-2">
                        <WifiIcon className="h-4 w-4" />
                        WiFi Connection
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Network</span>
                          <span>{currentAction.wifi.ssid}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Security
                          </span>
                          <span>{currentAction.wifi.security}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentAction.navigation && (
                    <div className="space-y-2 p-3 rounded-md bg-muted">
                      <div className="font-medium flex items-center gap-2">
                        <NavigationIcon className="h-4 w-4" />
                        Navigation
                      </div>
                      <div className="text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">URL</span>
                          <span className="truncate max-w-[150px]">
                            {currentAction.navigation.url}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {executionState !== 'idle' && (
                    <div className="pt-4">
                      <Button onClick={resetScanner} className="w-full">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Scan Another Code
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                How to Use
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Point Camera</p>
                    <p className="text-sm text-muted-foreground">
                      Position the code within the scanning frame
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Automatic Detection</p>
                    <p className="text-sm text-muted-foreground">
                      The scanner will automatically detect and process the code
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="mt-1 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Progressive Execution</p>
                    <p className="text-sm text-muted-foreground">
                      Complex actions execute progressively for optimal
                      experience
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple icon components to avoid importing from lucide-react in client component
function WifiIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="WiFi Icon"
    >
      <path d="M12 20h.01" />
      <path d="M2 8.82a15 15 0 0 1 20 0" />
      <path d="M5 12.859a10 10 0 0 1 14 0" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
    </svg>
  );
}

function NavigationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Navigation Icon"
    >
      <polygon points="3 11 22 2 13 21 11 13 3 11" />
    </svg>
  );
}
