import { FormControl, FormItem, FormMessage } from "@/components/ui/form";
import { MentionInput } from "@/components/ui/mention-input";
import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";

export default function AutoFormInput({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  // Try to get context data from the context store
  const selectedLayerContext = useLayerStore((state) => state.getSelectedContext());

  function formatedContext() {
    if (!selectedLayerContext) return {}
    if ("context" in selectedLayerContext) {
      return selectedLayerContext
    }
    return {
      context: selectedLayerContext,
    }
  }

  return (
    <div className="flex flex-row  items-center space-x-2">
      <FormItem className="flex w-full flex-col justify-start">
        {showLabel && (
          <AutoFormLabel
            label={fieldConfigItem?.label || label}
            isRequired={isRequired}
          />
        )}
        <FormControl>
          <MentionInput
            value={fieldPropsWithoutShowLabel.value as string}
            onChange={fieldPropsWithoutShowLabel.onChange}
            placeholder={fieldPropsWithoutShowLabel.placeholder}
            contextData={formatedContext()}
            className={fieldPropsWithoutShowLabel.className}
          />
        </FormControl>
        <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
        <FormMessage />
      </FormItem>
    </div>
  );
}
