import {
  AUTOFORM_FIELD_TYPES,
  type FieldTypes,
} from '@/components/ui/autoform/AutoForm';

export const FIELD_CONFIG_PANEL_STANDARD_CONTROLS = [
  'label',
  'description',
  'inputProps',
] as const;

export const FIELD_CONFIG_PANEL_KNOWN_CUSTOM_DATA_PRESETS = [
  'source',
  'sources',
  'options',
  'disableWhenValueIn',
  'tabs',
  'onlyAllow',
  'configDisabled',
] as const;

export type FieldConfigPanelStandardControl =
  (typeof FIELD_CONFIG_PANEL_STANDARD_CONTROLS)[number];

export type FieldConfigPanelKnownCustomDataPreset =
  (typeof FIELD_CONFIG_PANEL_KNOWN_CUSTOM_DATA_PRESETS)[number];

export type FieldConfigPanelControlId =
  | FieldConfigPanelStandardControl
  | `customData.${FieldConfigPanelKnownCustomDataPreset}`;

export type FieldConfigPanelControl = {
  id: FieldConfigPanelControlId;
  label: string;
};

export type FieldConfigPanelModel = {
  fieldType: FieldTypes;
  availableFieldTypes: readonly FieldTypes[];
  controls: readonly FieldConfigPanelControl[];
};

export type FieldConfigPanelSourcePreset = {
  table: string;
  key?: string;
} & (
  | {
      displayKey: string;
    }
  | {
      displayKeys: string[];
      separator: string;
      suffix?: string;
    }
);

export type FieldConfigPanelKnownCustomData = {
  source?: FieldConfigPanelSourcePreset;
  sources?: FieldConfigPanelSourcePreset[];
  options?: Array<readonly [string, string]>;
  disableWhenValueIn?: string[];
  tabs?: unknown[];
  onlyAllow?: string[];
  configDisabled?: boolean;
};

export type FieldConfigPanelDraft = {
  fieldType: FieldTypes;
  label?: string;
  description?: string;
  inputProps?: Record<string, unknown>;
  customData?: FieldConfigPanelKnownCustomData & Record<string, unknown>;
};

export type SerializedFieldConfigPanelDraft = {
  fieldType: FieldTypes;
  fieldConfig: {
    label?: string;
    description?: string;
    inputProps?: Record<string, unknown>;
    customData?: Record<string, unknown>;
  };
};

const FIELD_CONFIG_PANEL_CONTROLS: readonly FieldConfigPanelControl[] = [
  { id: 'label', label: 'Label' },
  { id: 'description', label: 'Description' },
  { id: 'inputProps', label: 'Input Props' },
  { id: 'customData.source', label: 'Source' },
  { id: 'customData.sources', label: 'Sources' },
  { id: 'customData.options', label: 'Options' },
  {
    id: 'customData.disableWhenValueIn',
    label: 'Disable When Value In',
  },
  { id: 'customData.tabs', label: 'Tabs' },
  { id: 'customData.onlyAllow', label: 'Only Allow' },
  {
    id: 'customData.configDisabled',
    label: 'Config Disabled',
  },
];

const FIELD_TYPE_SET = new Set<string>(AUTOFORM_FIELD_TYPES);

export function createFieldConfigPanelModel(
  fieldType: FieldTypes,
): FieldConfigPanelModel {
  assertFieldType(fieldType);

  return {
    fieldType,
    availableFieldTypes: AUTOFORM_FIELD_TYPES,
    controls: FIELD_CONFIG_PANEL_CONTROLS,
  };
}

export function serializeFieldConfigPanelDraft(
  draft: FieldConfigPanelDraft,
): SerializedFieldConfigPanelDraft {
  assertFieldType(draft.fieldType);

  const fieldConfig: SerializedFieldConfigPanelDraft['fieldConfig'] = {};

  if (draft.label !== undefined) fieldConfig.label = draft.label;
  if (draft.description !== undefined)
    fieldConfig.description = draft.description;
  if (draft.inputProps !== undefined) fieldConfig.inputProps = draft.inputProps;

  const customData = sanitizeCustomData(draft.customData);
  if (customData !== undefined) {
    fieldConfig.customData = customData;
  }

  return {
    fieldType: draft.fieldType,
    fieldConfig,
  };
}

function assertFieldType(fieldType: string): asserts fieldType is FieldTypes {
  if (!FIELD_TYPE_SET.has(fieldType)) {
    throw new Error(`Unsupported field type: ${fieldType}`);
  }
}

function sanitizeCustomData(
  customData: FieldConfigPanelDraft['customData'],
): Record<string, unknown> | undefined {
  if (customData === undefined) return undefined;

  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(customData)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return Object.keys(output).length > 0 ? output : undefined;
}
