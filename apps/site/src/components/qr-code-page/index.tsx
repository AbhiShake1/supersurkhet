import { Zap } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useFeaturePermissions } from '@/components/permission-gate/use-feature-permissions';
import { VisualFlowBuilder } from '@/components/qr/visual-flow-builder';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Unauthorized } from '@/components/ui/unauthorized';
import {
  type DataMatrixAction,
  dataMatrixActionSchema,
} from '@/lib/datamatrix';
import { ActionExecutor } from '@/lib/datamatrix/action-executor';

// biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
export function QRCodePage({ slug }: { slug: string }) {
  const dataMatrixPermissions = useFeaturePermissions('dataMatrixAction');
  const qrFlowPermissions = useFeaturePermissions('qrFlowConfig');
  const canRead = dataMatrixPermissions.canRead || qrFlowPermissions.canRead;
  const canEdit =
    dataMatrixPermissions.canCreate ||
    dataMatrixPermissions.canUpdate ||
    dataMatrixPermissions.canDelete ||
    qrFlowPermissions.canCreate ||
    qrFlowPermissions.canUpdate ||
    qrFlowPermissions.canDelete;

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

  if (!canRead) {
    return (
      <Unauthorized description="You do not have permission to access QR management." />
    );
  }

  return (
    <div className="w-full items-center flex justify-center">
      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Visual Flow Builder
            </CardTitle>
            <CardDescription>
              Create sophisticated interaction flows with powerful capabilities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VisualFlowBuilder canEdit={canEdit} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
