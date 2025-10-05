import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Bold, Italic, Underline, List, ListOrdered, Link, Image, Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldWrapperProps } from "./FieldWrapper";
import { useState, useRef } from "react";

export interface EditorFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function EditorField({
  field,
  label,
  description,
  error,
  className,
  placeholder,
  rows = 6,
  ...props
}: EditorFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (markdown: string, position: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const selectedText = text.substring(start, end);

    let newText = "";
    let newCursorPos = 0;

    if (markdown === "**") {
      newText = `${before}**${selectedText}**${after}`;
      newCursorPos = start + 2;
    } else if (markdown === "*") {
      newText = `${before}*${selectedText}*${after}`;
      newCursorPos = start + 1;
    } else if (markdown === "__") {
      newText = `${before}__${selectedText}__${after}`;
      newCursorPos = start + 2;
    } else if (markdown === "- ") {
      newText = `${before}- ${selectedText}${after}`;
      newCursorPos = start + 2;
    } else if (markdown === "1. ") {
      newText = `${before}1. ${selectedText}${after}`;
      newCursorPos = start + 3;
    } else if (markdown === "> ") {
      newText = `${before}> ${selectedText}${after}`;
      newCursorPos = start + 2;
    } else {
      newText = `${before}${markdown}${selectedText}${after}`;
      newCursorPos = start + markdown.length;
    }

    textarea.value = newText;
    textarea.focus();
    textarea.setSelectionRange(newCursorPos, newCursorPos);
    field.onChange(newText);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}
      
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border rounded-t-lg border-input bg-muted">
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("**", 0)}
          aria-label="Bold"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("*", 0)}
          aria-label="Italic"
        >
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("__", 0)}
          aria-label="Underline"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
        <div className="w-px bg-border mx-1" />
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("- ", 0)}
          aria-label="Bullet List"
        >
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("1. ", 0)}
          aria-label="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <div className="w-px bg-border mx-1" />
        <Toggle
          size="sm"
          onPressedChange={() => insertMarkdown("> ", 0)}
          aria-label="Quote"
        >
          <Quote className="h-4 w-4" />
        </Toggle>
      </div>
      
      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        id={field.name}
        placeholder={placeholder}
        className={cn(
          "flex min-h-[120px] w-full rounded-t-none rounded-b-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          error && "border-destructive"
        )}
        rows={rows}
        {...field}
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          field.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          field.onBlur?.(e);
        }}
      />
      
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
    </div>
  );
}