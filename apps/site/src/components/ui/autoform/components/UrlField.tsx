import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldWrapperProps } from './FieldWrapper';

export interface UrlFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  showPreviewButton?: boolean;
}

export function UrlField({
  field,
  label,
  description,
  error,
  className,
  placeholder = 'https://example.com',
  showPreviewButton = true,
  ...props
}: UrlFieldProps) {
  const handlePreview = () => {
    if (field.value) {
      window.open(field.value.toString(), '_blank');
    }
  };

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    field.onChange(value);
  };

  const isValidUrl = field.value && validateUrl(field.value.toString());

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label
          htmlFor={field.name}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </Label>
      )}

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            id={field.name}
            type="url"
            value={field.value?.toString() || ''}
            onChange={handleChange}
            placeholder={placeholder}
            className={cn(
              'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive',
              isValidUrl && 'border-green-500 focus-visible:ring-green-500',
            )}
            {...props}
          />
          {isValidUrl && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
            </div>
          )}
        </div>

        {showPreviewButton && field.value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={handlePreview}
            aria-label="Open link in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}
