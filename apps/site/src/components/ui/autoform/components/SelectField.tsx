import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AutoFormFieldProps } from "@autoform/react";
import type React from "react";
import { useFormContext } from "react-hook-form";
import { Combobox } from "../../combobox";
import { useState } from "react";

export const SelectField: React.FC<AutoFormFieldProps> = ({
  field,
  inputProps,
  error,
  id,
  value,
  path,
}) => {
  const { key, ...props } = inputProps;
  const options = (field.fieldConfig?.customData?.options || field.options) as typeof field.options
  const form = useFormContext()
  const [innerValue, setInnerValue] = useState(value || field.default)
  console.log({ options })

  return <Combobox
    {...props}
    options={options?.map(([value, label]) => ({
      value,
      label
    }))}
    value={innerValue}
    onValueChange={(value) => {
      setInnerValue(value)
      field.fieldConfig?.customData?.onValueChange?.(value, path, form)
      const syntheticEvent = {
        target: {
          value,
          name: path.join("."),
        },
      } as React.ChangeEvent<HTMLInputElement>;
      props.onChange(syntheticEvent);
    }}
    className={error ? "border-destructive" : ""}
    disabled={props.disabled}
  />
};
