import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import { MentionInputTextarea } from '@/components/ui/mention-input-textarea';
import AutoFormLabel from '../common/label';
import AutoFormTooltip from '../common/tooltip';
import type { AutoFormInputComponentProps } from '../types';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';

export default function AutoFormTextarea({
  label,
  isRequired,
  fieldConfigItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  const { showLabel: _showLabel, ...fieldPropsWithoutShowLabel } = fieldProps;
  const showLabel = _showLabel === undefined ? true : _showLabel;

  const contextData = useLayerStore((state) => state.getSelectedContext());

  function formatedContext() {
    if (!contextData) return {};
    if ('context' in contextData) {
      return contextData;
    }
    return {
      context: contextData,
    };
  }

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
          contextData={formatedContext()}
          className={fieldPropsWithoutShowLabel.className}
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
