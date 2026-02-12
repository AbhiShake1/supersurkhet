import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

export const RichTextField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
}) => {
  // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
  const { key, ...props } = inputProps;

  return (
    <Textarea
      id={id}
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-destructive',
      )}
      {...props}
    />
  );
};
