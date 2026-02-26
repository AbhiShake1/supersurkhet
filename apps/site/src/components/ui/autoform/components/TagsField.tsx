import { X } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

function toTags(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.filter((tag): tag is string => typeof tag === 'string');
}

export const TagsField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  value,
}) => {
  const { key, onChange, name, disabled, ...props } = inputProps;
  void key;

  const [inputValue, setInputValue] = useState('');
  const tags = toTags(value);

  const emitChange = (nextTags: string[]) => {
    const eventLike = {
      target: {
        name,
        value: nextTags,
      },
    };
    onChange?.(
      eventLike as unknown as Parameters<NonNullable<typeof onChange>>[0],
    );
  };

  const addTag = () => {
    const tag = inputValue.trim();
    if (!tag || tags.includes(tag) || disabled) return;
    emitChange([...tags, tag]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    if (disabled) return;
    emitChange(tags.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex min-h-10 flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2',
          error && 'border-destructive',
          disabled && 'opacity-50',
        )}
      >
        {tags.map((tag, index) => (
          <Badge key={tag} variant="secondary" className="gap-1">
            <span className="text-xs">{tag}</span>
            <button
              type="button"
              className="rounded-full p-0.5 hover:bg-muted-foreground/20"
              onClick={() => removeTag(index)}
              aria-label={`Remove tag ${tag}`}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        <Input
          type="text"
          className="h-6 flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ',') {
              event.preventDefault();
              addTag();
            }
            if (
              event.key === 'Backspace' &&
              inputValue === '' &&
              tags.length > 0
            ) {
              removeTag(tags.length - 1);
            }
          }}
          onBlur={props.onBlur}
          placeholder={props.placeholder ?? 'Add a tag...'}
          disabled={disabled}
          data-testid={props['data-testid']}
        />
      </div>
    </div>
  );
};
