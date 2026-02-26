import { forwardRef } from 'react';
import QRCodeBase, { type QRCodeProps } from 'react-qr-code';
import { cn } from '@/lib/utils';

export const QRCode = forwardRef<QRCodeBase, QRCodeProps>(
  ({ className, ...props }) => (
    <QRCodeBase
      {...props}
      className={cn('border-4 rounded-2xl p-4', className)}
    />
  ),
);
