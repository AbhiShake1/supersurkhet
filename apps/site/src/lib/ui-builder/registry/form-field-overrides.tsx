import React from "react";
import {
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { ChildrenSearchableSelect } from "@/components/ui/ui-builder/internal/form-fields/children-searchable-select";
import type {
  AutoFormInputComponentProps,
  ComponentLayer,
  FieldConfigFunction,
} from "@/components/ui/ui-builder/types";
import IconNameField from "@/components/ui/ui-builder/internal/form-fields/iconname-field";
import { MinimalTiptapEditor } from "@/components/ui/minimal-tiptap/minimal-tiptap";
import { useLayerStore } from "../store/layer-store";
import BreakpointClassNameControl from "@/components/ui/ui-builder/internal/form-fields/classname-control";
import { MentionInput } from "@/components/ui/mention-input";
import { MentionInputTextarea } from "@/components/ui/mention-input-textarea";

export const classNameFieldOverrides: FieldConfigFunction = () => {
  return {
    fieldType: ({
      label,
      isRequired,
      field,
      fieldConfigItem,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        label={label}
        isRequired={isRequired}
        fieldConfigItem={fieldConfigItem}
      >
        <BreakpointClassNameControl
          value={field.value}
          onChange={field.onChange}
        />
      </FormFieldWrapper>
    ),
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const childrenFieldOverrides: FieldConfigFunction = (
  layer,
) => {
  return {
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        label={label}
        isRequired={isRequired}
        fieldConfigItem={fieldConfigItem}
      >
        <ChildrenSearchableSelect
          layer={layer}
          onChange={field.onChange}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

export const iconNameFieldOverrides: FieldConfigFunction = (layer) => {
  return {
    fieldType: ({
      label,
      isRequired,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <IconNameField
        label={label}
        isRequired={isRequired}
        value={layer.props.iconName}
        onChange={field.onChange}
        {...fieldProps}
      />
    ),
  };
};

export const childrenAsTextareaFieldOverrides: FieldConfigFunction = (
  layer
) => {
  return {
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => {
      // Try to get context data from the context store
      const contextData = useLayerStore((state) => state.getSelectedContext());

      return (
        <FormFieldWrapper
          label={label}
          isRequired={isRequired}
          fieldConfigItem={fieldConfigItem}
        >
          <MentionInputTextarea
            value={layer.children as string}
            onChange={field.onChange}
            contextData={contextData}
            {...fieldProps}
          />
        </FormFieldWrapper>
      );
    },
  };
};

export const childrenAsTipTapFieldOverrides: FieldConfigFunction = (
  layer,
) => {
  return {
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => (
      <FormFieldWrapper
        label={label}
        isRequired={isRequired}
        fieldConfigItem={fieldConfigItem}
      >
        <MinimalTiptapEditor
          immediatelyRender={false}
          output="markdown"
          editable={true}
          value={layer.children as string}
          editorClassName="focus:outline-none px-4 py-2 h-full"
          // eslint-disable-next-line react-perf/jsx-no-new-function-as-prop
          onChange={(content) => {
            //if string call field.onChange
            if (typeof content === "string") {
              field.onChange(content);
            } else {
              console.warn("Tiptap content is not a string");
            }
          }}
          {...fieldProps}
        />
      </FormFieldWrapper>
    ),
  };
};

// Memoized common field overrides to avoid recreating objects
const memoizedCommonFieldOverrides = new Map<boolean, Record<string, FieldConfigFunction>>();

export const commonFieldOverrides = (allowBinding = false) => {
  if (memoizedCommonFieldOverrides.has(allowBinding)) {
    return memoizedCommonFieldOverrides.get(allowBinding)!;
  }

  const overrides = {
    className: (layer: ComponentLayer) => classNameFieldOverrides(layer),
    children: (layer: ComponentLayer) => childrenFieldOverrides(layer),
  };

  memoizedCommonFieldOverrides.set(allowBinding, overrides);
  return overrides;
};

export const textInputFieldOverrides = (
) => {
  return {
    fieldType: ({
      label,
      isRequired,
      fieldConfigItem,
      field,
      fieldProps,
    }: AutoFormInputComponentProps) => {
      // Try to get context data from the context store
      const contextData = useLayerStore((state) => state.getSelectedContext());

      return (
        <FormFieldWrapper
          label={label}
          isRequired={isRequired}
          fieldConfigItem={fieldConfigItem}
        >
          <MentionInput
            value={field.value as string}
            onChange={field.onChange}
            contextData={contextData}
            {...fieldProps}
          />
        </FormFieldWrapper>
      );
    },
  };
};

export function FormFieldWrapper({
  label,
  isRequired,
  fieldConfigItem,
  children,
}: {
  label: string;
  isRequired?: boolean;
  fieldConfigItem?: { description?: React.ReactNode };
  children: React.ReactNode;
}) {
  return (
    <FormItem className="flex flex-col">
      <FormLabel>
        {label}
        {isRequired && <span className="text-destructive"> *</span>}
      </FormLabel>
      <FormControl>{children}</FormControl>
      {fieldConfigItem?.description && (
        <FormDescription>{fieldConfigItem.description}</FormDescription>
      )}
    </FormItem>
  );
}
