import { Link } from '@tanstack/react-router';
import { ArrowRight, Bot, Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { VisualFlowBuilder } from '@/components/qr/visual-flow-builder';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  type DataMatrixAction,
  dataMatrixActionSchema,
} from '@/lib/datamatrix';
import { ActionExecutor } from '@/lib/datamatrix/action-executor';

export function QRCodePage({ slug }: { slug: string }) {
  const [_sampleAction] = useState<DataMatrixAction>(() => {
    return dataMatrixActionSchema.parse({
      version: '1.0',
      action: 'wifi_connect',
      wifi: {
        ssid: 'SuperSurkhet-Guest',
        password: 'Welcome@2025',
        security: 'WPA2',
      },
      post_connect: {
        notification: {
          title: 'Welcome to SuperSurkhet!',
          message:
            "You're now connected to our guest network. Explore our digital services.",
        },
      },
    });
  });

  const _handleActionDetected = (action: DataMatrixAction) => {
    // Execute the action progressively
    const executor = new ActionExecutor(action);

    executor.onProgress((state) => {
      console.log('Action progress:', state);
    });

    executor.onError((error) => {
      toast.error(`Action execution failed: ${error.message}`);
    });

    executor.execute().catch((error) => {
      // Error already handled by executor
      console.error('Action execution failed:', error);
    });
  };
  void _handleActionDetected;

  return (
    <div className="w-full items-center flex justify-center">
      <div className="container space-y-6 py-8">
        <Card className="border-border/60 bg-gradient-to-br from-cyan-50 via-background to-emerald-50 dark:from-cyan-950/25 dark:to-emerald-950/25">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              DataMatrix Agent Console
            </CardTitle>
            <CardDescription>
              Open the dedicated deterministic scan console with runtime
              timeline, manual retry controls, keyboard shortcuts, and
              bridge/scheduler log slots.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link
                to="/$businessName/admin/qr-agent"
                params={{ businessName: slug }}
              >
                Open Opinionated Agent Console
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Visual Flow Builder
            </CardTitle>
            <CardDescription>
              Create sophisticated interaction flows with powerful capabilities.
              Preview print opens in a new tab and may require popup permission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisualFlowBuilder />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
