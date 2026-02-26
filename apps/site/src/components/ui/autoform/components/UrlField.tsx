import { ExternalLink } from 'lucide-react';
import type React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

function isValidUrl(value: string) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export const UrlField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, ...props } = inputProps;
  void key;

  const currentValue = typeof value === 'string' ? value : '';
  const hasValidUrl = Boolean(currentValue) && isValidUrl(currentValue);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          id={id}
          type="url"
          className={cn(error && 'border-destructive')}
          value={currentValue}
          {...props}
        />
        {hasValidUrl && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </div>
        )}
      </div>
      {hasValidUrl && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => window.open(currentValue, '_blank')}
          aria-label="Open link in new tab"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
