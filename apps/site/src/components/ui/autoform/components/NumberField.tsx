import { Input } from "@/components/ui/input";
import type { AutoFormFieldProps } from "@autoform/react";
import type React from "react";
import { useFormContext } from "react-hook-form";

export const NumberField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  error,
  id,
  field,
  path
}) => {
  const { key, ...props } = inputProps;
  const form = useFormContext()

  return (
    <Input
      id={id}
      type="number"
      className={error ? "border-destructive" : ""}
      {...props}
      onChange={(e) => {
        props.onChange(e)
        field.fieldConfig?.customData?.onValueChange?.(e.target.value, path, form);
      }}
    />
  );
};
