'use client';

import { QrCode, X } from 'lucide-react';
import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { DataMatrixScanner } from '@/components/ui/datamatrix-scanner';
import type { DataMatrixAction } from '@/lib/datamatrix';
import { cn } from '@/lib/utils';

interface QRScannerButtonProps extends React.HTMLAttributes<HTMLDivElement> {
  onActionDetected?: (action: DataMatrixAction) => void;
}

const QRScannerButton = React.forwardRef<HTMLDivElement, QRScannerButtonProps>(
  ({ className, onActionDetected, ...props }, ref) => {
    if (typeof window === 'undefined') return null;
    // Calculate default position (bottom center)
    const getDefaultPosition = () => ({
      x: window.innerWidth / 2 - 32,
      y: window.innerHeight - 100,
    });
    const getInitialPosition = () => {
      const defaultPosition = getDefaultPosition();
      const savedPosition = localStorage.getItem('qrScannerButtonPosition');
      if (!savedPosition) {
        return defaultPosition;
      }
      try {
        return JSON.parse(savedPosition) as { x: number; y: number };
      } catch {
        return defaultPosition;
      }
    };

    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const [position, setPosition] = React.useState(getInitialPosition);
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const [isDragging, setIsDragging] = React.useState(false);
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const [isOpen, setIsOpen] = React.useState(false);
    const [initialPosition, setInitialPosition] =
      // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
      React.useState(getInitialPosition);
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const buttonRef = React.useRef<HTMLButtonElement>(null);

    // Handle window resize
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    React.useEffect(() => {
      const handleResize = () => {
        setPosition((prev) => {
          // Keep button within viewport bounds
          const boundedPosition = {
            x: Math.max(0, Math.min(prev.x, window.innerWidth - 64)),
            y: Math.max(0, Math.min(prev.y, window.innerHeight - 64)),
          };
          localStorage.setItem(
            'qrScannerButtonPosition',
            JSON.stringify(boundedPosition),
          );
          return boundedPosition;
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
      setInitialPosition(position);
    };

    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const handleMouseMove = React.useCallback(
      (e: MouseEvent) => {
        if (isDragging) {
          const newPosition = {
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y,
          };

          // Keep button within viewport bounds
          const boundedPosition = {
            x: Math.max(0, Math.min(newPosition.x, window.innerWidth - 64)),
            y: Math.max(0, Math.min(newPosition.y, window.innerHeight - 64)),
          };

          setPosition(boundedPosition);
        }
      },
      [isDragging, dragStart],
    );

    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const handleMouseUp = React.useCallback(() => {
      setIsDragging(false);
      localStorage.setItem('qrScannerButtonPosition', JSON.stringify(position));

      // If the button didn't move much, treat it as a click
      const distance = Math.sqrt(
        (position.x - initialPosition.x) ** 2 +
          (position.y - initialPosition.y) ** 2,
      );

      if (distance < 5) {
        setIsOpen(true);
      }
    }, [position, initialPosition]);

    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = 'none';
      } else {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      }

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.userSelect = '';
      };
    }, [isDragging, handleMouseMove, handleMouseUp]);

    const handleActionDetected = (action: DataMatrixAction) => {
      onActionDetected?.(action);
      setIsOpen(false);
      toast.success('Action detected!');
    };

    return (
      <>
        <div
          ref={ref}
          className={cn(
            'fixed z-50 transition-all duration-200',
            isDragging ? 'cursor-grabbing' : 'cursor-pointer',
            className,
          )}
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          {...props}
        >
          <Button
            ref={buttonRef}
            size="icon"
            className={cn(
              'h-16 w-16 rounded-full shadow-lg transition-all duration-200 hover:shadow-xl',
              isDragging ? 'scale-110' : '',
            )}
            onMouseDown={handleMouseDown}
          >
            <QrCode className="h-8 w-8" />
          </Button>
        </div>

        {/* Full-screen QR Scanner Overlay */}
        {isOpen && (
          // biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup
          <div
            className="fixed inset-0 z-[100] bg-background flex flex-col"
            onKeyDown={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-semibold">Scan QR Code</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            <div className="flex-1 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <DataMatrixScanner
                  onActionDetected={handleActionDetected}
                  showControls={false}
                  showManualInput={false}
                  showScanResults={false}
                />
              </div>
            </div>

            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Point your camera at a QR code or DataMatrix to scan
            </div>
          </div>
        )}
      </>
    );
  },
);

QRScannerButton.displayName = 'QRScannerButton';

export { QRScannerButton, type QRScannerButtonProps };
