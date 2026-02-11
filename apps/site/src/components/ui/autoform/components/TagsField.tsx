import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FieldWrapperProps } from './FieldWrapper';
import { useState, useRef, useEffect } from 'react';

export interface TagsFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  maxTags?: number;
}

export function TagsField({
  field,
  label,
  description,
  error,
  className,
  placeholder = 'Add a tag...',
  maxTags,
  ...props
}: TagsFieldProps) {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<string[]>(
    Array.isArray(field.value) ? field.value : [],
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Update field value when tags change
  useEffect(() => {
    field.onChange(tags);
  }, [tags, field]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const trimmedValue = inputValue.trim();
    if (
      trimmedValue &&
      !tags.includes(trimmedValue) &&
      (!maxTags || tags.length < maxTags)
    ) {
      setTags([...tags, trimmedValue]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const newTags = pastedText
      .split(/[,;\n]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag && !tags.includes(tag));

    if (newTags.length > 0) {
      const availableSlots = maxTags
        ? maxTags - tags.length
        : Number.POSITIVE_INFINITY;
      const tagsToAdd = newTags.slice(0, availableSlots);
      setTags([...tags, ...tagsToAdd]);
    }
  };

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

      <div
        className={cn(
          'flex flex-wrap items-center gap-2 rounded-md border border-input bg-background px-3 py-2 min-h-10',
          error && 'border-destructive',
          field.disabled && 'opacity-50',
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 pl-2 pr-1 py-1"
          >
            <span className="text-xs">{tag}</span>
            <button
              type="button"
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(index);
              }}
              disabled={field.disabled}
              aria-label={`Remove tag ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}

        {!field.disabled && (!maxTags || tags.length < maxTags) && (
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onPaste={handlePaste}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 border-0 p-0 h-6 focus-visible:ring-0 focus-visible:ring-offset-0"
            disabled={field.disabled}
          />
        )}
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}

      {maxTags && (
        <p className="text-xs text-muted-foreground text-right">
          {tags.length}/{maxTags} tags
        </p>
      )}
    </div>
  );
}
