import React from "react";
import { AutoFormField } from "./AutoFormField";
import { useAutoForm } from "./context";
import { getLabel, type ParsedField } from "@autoform/core";
import { formatTestId } from "./utils";

export const ObjectField: React.FC<{
  field: ParsedField;
  path: string[];
}> = ({ field, path }) => {
  const { uiComponents } = useAutoForm();
  const testIdBase = formatTestId(path);

  return (
    <uiComponents.ObjectWrapper
      label={getLabel(field)}
      field={field}
      testId={testIdBase}
    >
      {Object.entries(field.schema!).map(([_key, subField]) => (
        <AutoFormField
          key={`${path.join(".")}.${subField.key}`}
          field={subField}
          path={[...path, subField.key]}
        />
      ))}
    </uiComponents.ObjectWrapper>
  );
};
