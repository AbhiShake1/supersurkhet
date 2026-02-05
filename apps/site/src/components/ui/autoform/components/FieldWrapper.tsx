import type React from "react";
import { Label } from "@/components/ui/label";
import type { FieldWrapperProps } from "../react";

const DISABLED_LABELS = ["boolean", "object", "array"];

export type { FieldWrapperProps }

export const FieldWrapperWithoutLabel: React.FC<FieldWrapperProps> = ({
  children,
  field,
  error,
  testId,
}) => {
  return (
    <div className="space-y-2" data-testid={testId ? `af-field-${testId}` : undefined}>
      {children}
      {field.fieldConfig?.description && (
        <p className="text-sm text-muted-foreground">
          {field.fieldConfig.description}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  children,
  id,
  field,
  error,
  testId,
}) => {
  const isDisabled = DISABLED_LABELS.includes(field.type);

  return (
    <div className="space-y-2" data-testid={testId ? `af-field-${testId}` : undefined}>
      {!isDisabled && (
        <Label htmlFor={id}>
          {label}
          {field.required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {children}
      {field.fieldConfig?.description && (
        <p className="text-sm text-muted-foreground">
          {field.fieldConfig.description}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
};
