import { BakeryColor } from '@barcode-bakery/barcode-react';
import { BakeryDatamatrix } from '@barcode-bakery/barcode-react/datamatrix';
import { toDataURL } from 'qrcode';
import { forwardRef, useEffect, useState } from 'react';
import type { DataMatrixAction } from '@/lib/datamatrix';
import { cn } from '@/lib/utils';

export interface DataMatrixCodeProps {
  value: DataMatrixAction | string;
  className?: string;
  size?: number;
  format?: 'datamatrix' | 'qr';
}

export const DataMatrixCode = forwardRef<HTMLDivElement, DataMatrixCodeProps>(
  ({ value, className, size = 200, format = 'datamatrix' }, ref) => {
    const [error, setError] = useState<string | null>(null);
    const [dataUrl, setDataUrl] = useState<string | null>(null);

    // Convert value to string if it's an object
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);

    useEffect(() => {
      if (format !== 'qr') return;

      // Generate QR Code
      toDataURL(stringValue, { width: size, margin: 2 })
        .then((url) => {
          setDataUrl(url);
          setError(null);
        })
        .catch((err) => {
          setError(`Failed to generate QR code: ${err.message}`);
        });
    }, [size, format, stringValue]);

    if (format === 'datamatrix') {
      const colorBlack = new BakeryColor(0, 0, 0);
      const colorWhite = new BakeryColor(255, 255, 255);

      return (
        <div ref={ref} className={cn('relative', className)}>
          <BakeryDatamatrix
            scale={size / 50} // Adjust scale based on size
            foregroundColor={colorBlack}
            backgroundColor={colorWhite}
            text={stringValue}
            quietZone={10}
          />
          <div className="absolute bottom-2 right-2 bg-black text-white text-xs px-1 rounded">
            {format.toUpperCase()}
          </div>
        </div>
      );
    }

    return (
      <div ref={ref} className={cn('relative', className)}>
        {error ? (
          <div className="flex items-center justify-center w-full h-full bg-red-100 border border-red-300 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt="QR Code"
            className="border-4 rounded-2xl p-4 w-full h-full"
            style={{ width: size, height: size }}
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gray-100 border border-gray-300 rounded-lg">
            Loading...
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black text-white text-xs px-1 rounded">
          {format.toUpperCase()}
        </div>
      </div>
    );
  },
);
