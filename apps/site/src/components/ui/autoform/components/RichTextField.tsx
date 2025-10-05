import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { FieldWrapperProps } from "./FieldWrapper";

export interface RichTextFieldProps extends FieldWrapperProps {
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function RichTextField({
  field,
  label,
  description,
  error,
  className,
  placeholder,
  rows = 4,
  ...props
}: RichTextFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor={field.name} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}
      <Textarea
        id={field.name}
        placeholder={placeholder}
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive"
        )}
        rows={rows}
        {...field}
        {...props}
      />
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error.message}</p>}
    </div>
  );
}