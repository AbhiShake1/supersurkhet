import { cn } from "@/lib/utils";
import * as React from "react";
import { Label } from "./label";
import { Input } from "./input";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  description?: string;
  error?: string;
  htmlFor?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  (
    {
      label,
      description,
      error,
      htmlFor,
      id,
      required,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const fieldId = id || htmlFor || React.useId();

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {label && (
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && <span className="ml-1 text-destructive">*</span>}
          </Label>
        )}
        <div className="relative">
          {children || (
            <Input
              id={fieldId}
              required={required}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={error ? `${fieldId}-error` : undefined}
            />
          )}
        </div>
        {description && !error && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        {error && (
          <p id={`${fieldId}-error`} className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Field.displayName = "Field";

interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const FieldGroup = React.forwardRef<HTMLDivElement, FieldGroupProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      {children}
    </div>
  )
);
FieldGroup.displayName = "FieldGroup";

interface FieldLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  required?: boolean;
  children: React.ReactNode;
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FieldLabelProps
>(({ required, className, children, ...props }, ref) => (
  <Label ref={ref} className={cn("text-sm font-medium", className)} {...props}>
    {children}
    {required && <span className="ml-1 text-destructive">*</span>}
  </Label>
));
FieldLabel.displayName = "FieldLabel";

interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const FieldDescription = ({
  className,
  children,
  ...props
}: FieldDescriptionProps) => (
  <p
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  >
    {children}
  </p>
);
FieldDescription.displayName = "FieldDescription";

interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

const FieldError = ({ className, children, ...props }: FieldErrorProps) => (
  <p
    className={cn("text-sm text-destructive", className)}
    {...props}
  >
    {children}
  </p>
);
FieldError.displayName = "FieldError";

export { Field, FieldGroup, FieldLabel, FieldDescription, FieldError };