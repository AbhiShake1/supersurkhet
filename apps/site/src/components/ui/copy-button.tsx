'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Check, Copy, Image } from 'lucide-react';
import { toast } from 'sonner';

interface CopyButtonProps extends ButtonProps {
  value?: string;
  getImage?: () => Promise<Blob | null>;
  onCopy?: () => void;
  copyType?: 'text' | 'image';
}

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      value,
      getImage,
      onCopy,
      className,
      variant = 'outline',
      size = 'sm',
      copyType = 'text',
      children,
      ...props
    },
    ref,
  ) => {
    const [isCopied, setIsCopied] = React.useState(false);

    const copyText = async () => {
      if (!value) return;

      try {
        await navigator.clipboard.writeText(value);
        setIsCopied(true);
        onCopy?.();
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy to clipboard');
      }
    };

    const copyImage = async () => {
      if (!getImage) return;

      try {
        const blob = await getImage();
        if (!blob) {
          toast.error('Failed to get image data');
          return;
        }

        const item = new ClipboardItem({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
        setIsCopied(true);
        onCopy?.();
        setTimeout(() => setIsCopied(false), 2000);
      } catch (error) {
        toast.error('Failed to copy image to clipboard');
      }
    };

    const handleCopy = () => {
      if (copyType === 'image' && getImage) {
        copyImage();
      } else if (copyType === 'text' && value) {
        copyText();
      }
    };

    return (
      <Button
        ref={ref}
        variant={variant}
        size={size}
        className={cn('transition-all duration-200', className)}
        onClick={handleCopy}
        disabled={!value && !getImage}
        {...props}
      >
        {isCopied ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="ml-2">Copied!</span>
          </>
        ) : (
          <>
            {copyType === 'image' ? (
              <Image className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-2">
              {children || (copyType === 'image' ? 'Copy Image' : 'Copy')}
            </span>
          </>
        )}
      </Button>
    );
  },
);

CopyButton.displayName = 'CopyButton';

export { CopyButton, type CopyButtonProps };
