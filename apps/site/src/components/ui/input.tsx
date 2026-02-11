import { cn } from '@/lib/utils';
import * as React from 'react';
import { z } from 'zod';

const InputSchema = z.object({
  placeholder: z.string().default('Write something...'),
  type: z
    .enum([
      'button',
      'checkbox',
      'color',
      'date',
      'datetime-local',
      'email',
      'file',
      'hidden',
      'image',
      'month',
      'number',
      'password',
      'radio',
      'range',
      'reset',
      'search',
      'submit',
      'tel',
      'text',
      'time',
      'url',
      'week',
    ])
    .default('text')
    .optional(),
  leadingIcon: z.custom<React.ReactNode>().optional(),
  trailingIcon: z.custom<React.ReactNode>().optional(),
  className: z.string().optional(),
  disabled: z.boolean().optional(),
  value: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  required: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  autoFocus: z.boolean().optional(),
  autoComplete: z.string().optional(),
  autoCapitalize: z.string().optional(),
  autoCorrect: z.string().optional(),
  spellCheck: z.union([z.literal(true), z.literal(false)]).optional(),
  maxLength: z.number().optional(),
  minLength: z.number().optional(),
  pattern: z.string().optional(),
  min: z.union([z.string().optional(), z.number().optional()]).optional(),
  max: z.union([z.string().optional(), z.number().optional()]).optional(),
  step: z.union([z.literal('any'), z.string(), z.number()]).optional(),
  multiple: z.boolean().optional(),
  size: z.number().optional(),
  defaultValue: z.union([z.string(), z.number()]).optional(),
});

type InputProps = z.infer<typeof InputSchema> & React.ComponentProps<'input'>;

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function checkNonNullish(value: any) {
  if (!value) return false;
  if (Array.isArray(value)) {
    if (value.length === 0) return false;
    return value.filter(Boolean);
  }
  return true;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, leadingIcon, trailingIcon, ...props }, ref) => {
    const hasLeading = checkNonNullish(leadingIcon);
    const hasTrailing = checkNonNullish(trailingIcon);

    return (
      <div className="relative flex w-full">
        <input
          ref={ref}
          type={type}
          className={cn(
            'flex h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',

            // icon-aware padding
            hasLeading && 'pl-9',
            hasTrailing && 'pr-9',

            // search reset
            type === 'search' &&
              '[&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none [&::-webkit-search-results-button]:appearance-none [&::-webkit-search-results-decoration]:appearance-none',

            // file input
            type === 'file' &&
              'p-0 pr-3 italic text-muted-foreground/70 file:me-3 file:h-full file:border-0 file:border-r file:border-input file:bg-transparent file:px-3 file:text-sm file:font-medium file:not-italic file:text-foreground',

            className,
          )}
          {...props}
        />

        {hasLeading && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-muted-foreground/80">
            {leadingIcon}
          </div>
        )}

        {hasTrailing && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground/80">
            {trailingIcon}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
export { Input, InputSchema };
