import { describe, expect, it } from 'vitest';
import { AUTOFORM_FIELD_TYPES } from '@/components/ui/autoform/AutoForm';
import {
  createFieldConfigPanelModel,
  FIELD_CONFIG_PANEL_KNOWN_CUSTOM_DATA_PRESETS,
  FIELD_CONFIG_PANEL_STANDARD_CONTROLS,
  serializeFieldConfigPanelDraft,
} from './field-config-panel';

describe('FieldConfigPanel module', () => {
  it('exposes controls for every supported autoform field type', () => {
    for (const fieldType of AUTOFORM_FIELD_TYPES) {
      const model = createFieldConfigPanelModel(fieldType);

      expect(model.fieldType).toBe(fieldType);
      expect(model.availableFieldTypes).toEqual(AUTOFORM_FIELD_TYPES);

      const controlIds = model.controls.map((control) => control.id);
      expect(controlIds).toEqual([
        ...FIELD_CONFIG_PANEL_STANDARD_CONTROLS,
        ...FIELD_CONFIG_PANEL_KNOWN_CUSTOM_DATA_PRESETS.map(
          (preset) => `customData.${preset}`,
        ),
      ]);
    }
  });

  it('serializes known customData presets as first-class fieldConfig payload', () => {
    const serialized = serializeFieldConfigPanelDraft({
      fieldType: 'select',
      label: 'Status',
      description: 'Choose one status',
      inputProps: {
        placeholder: 'Pick status',
        disabled: false,
      },
      customData: {
        source: {
          table: 'business',
          displayKey: 'name',
        },
        sources: [
          {
            table: 'business',
            displayKey: 'name',
          },
        ],
        options: [
          ['draft', 'Draft'],
          ['published', 'Published'],
        ],
        disableWhenValueIn: ['locked'],
        tabs: [{ id: 'overview', label: 'Overview' }],
        onlyAllow: ['kg', 'lb'],
        configDisabled: true,
      },
    });

    expect(serialized).toEqual({
      fieldType: 'select',
      fieldConfig: {
        label: 'Status',
        description: 'Choose one status',
        inputProps: {
          placeholder: 'Pick status',
          disabled: false,
        },
        customData: {
          source: {
            table: 'business',
            displayKey: 'name',
          },
          sources: [
            {
              table: 'business',
              displayKey: 'name',
            },
          ],
          options: [
            ['draft', 'Draft'],
            ['published', 'Published'],
          ],
          disableWhenValueIn: ['locked'],
          tabs: [{ id: 'overview', label: 'Overview' }],
          onlyAllow: ['kg', 'lb'],
          configDisabled: true,
        },
      },
    });
  });

  it('throws when an unsupported field type is requested', () => {
    expect(() =>
      createFieldConfigPanelModel(
        'not-a-field-type' as (typeof AUTOFORM_FIELD_TYPES)[number],
      ),
    ).toThrow('Unsupported field type: not-a-field-type');
  });
});
