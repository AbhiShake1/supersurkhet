import { Zap } from 'lucide-react';
import { useState } from 'react';
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

export function QRCodePage(_: { slug: string }) {
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
