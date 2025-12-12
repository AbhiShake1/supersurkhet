import { FormControl, FormItem, FormMessage } from "@/components/ui/form";
import { MentionInputTextarea } from "@/components/ui/mention-input-textarea";
import AutoFormLabel from "../common/label";
import AutoFormTooltip from "../common/tooltip";
import type { AutoFormInputComponentProps } from "../types";
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";

export default function AutoFormTextarea({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  const contextData = useLayerStore((state) => state.getSelectedContext());

  return (
    <FormItem>
      {showLabel && (
        <AutoFormLabel
          label={fieldConfigItem?.label || label}
          isRequired={isRequired}
        />
      )}
      <FormControl>
        <MentionInputTextarea
          value={fieldPropsWithoutShowLabel.value as string}
          onChange={fieldPropsWithoutShowLabel.onChange}
          placeholder={fieldPropsWithoutShowLabel.placeholder}
          contextData={{
            context: contextData,
          }}
          className={fieldPropsWithoutShowLabel.className}
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
