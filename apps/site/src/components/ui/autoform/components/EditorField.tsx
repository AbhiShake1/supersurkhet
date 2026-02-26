import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Underline,
} from 'lucide-react';
import type React from 'react';
import { useRef } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

function toEditorValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export const EditorField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  value,
}) => {
  const { key, onChange, name, disabled, ...props } = inputProps;
  void key;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const emitChange = (nextValue: string) => {
    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    } as React.ChangeEvent<HTMLTextAreaElement>);
  };

  const insertMarkdown = (markdown: string) => {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = toEditorValue(value);
    const before = current.slice(0, start);
    const selected = current.slice(start, end);
    const after = current.slice(end);

    const prefix = markdown;
    let suffix = '';
    if (markdown === '**' || markdown === '*' || markdown === '__') {
      suffix = markdown;
    }

    const nextValue = `${before}${prefix}${selected}${suffix}${after}`;
    emitChange(nextValue);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1 rounded-t-lg border border-input bg-muted p-2">
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('**')}
          aria-label="Bold"
          disabled={disabled}
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('*')}
          aria-label="Italic"
          disabled={disabled}
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('__')}
          aria-label="Underline"
          disabled={disabled}
        >
          <Underline className="h-4 w-4" />
        </Toggle>
        <div className="mx-1 w-px bg-border" />
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('- ')}
          aria-label="Bullet List"
          disabled={disabled}
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('1. ')}
          aria-label="Numbered List"
          disabled={disabled}
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <div className="mx-1 w-px bg-border" />
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown('> ')}
          aria-label="Quote"
          disabled={disabled}
        >
          <Quote className="h-4 w-4" />
        </Toggle>
      </div>

      <Textarea
        ref={textareaRef}
        id={id}
        value={toEditorValue(value)}
        className={cn(
          'min-h-[120px] resize-none rounded-none rounded-b-md',
          error && 'border-destructive',
        )}
        onChange={(event) => emitChange(event.target.value)}
        onBlur={props.onBlur}
        disabled={disabled}
        placeholder={props.placeholder}
        data-testid={props['data-testid']}
      />
    </div>
  );
};
