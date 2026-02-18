import { useMutation, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ArrowRight,
  BadgePlus,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/components/auth-provider';
import { useConfetti } from '@/components/confetti-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AUTOFORM_FIELD_TYPES } from '@/components/ui/autoform';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import {
  MARKETPLACE_SEED_RELEASES,
  parseReleaseId,
} from '@/lib/plugins/marketplace-seed';
import type {
  ActionManifestDoc,
  AdminTabDoc,
  PluginReleaseDoc,
  SchemaDoc,
  SchemaFieldDoc,
  WorkflowDoc,
} from '@/lib/plugins/types';
import {
  ensureMarketplaceSeedReleases,
  previewPluginReleaseHashes,
  publishPluginRelease,
} from '@/server-functions/plugins';

export const Route = createFileRoute('/plugin-studio')({
  component: PluginStudioRoute,
});

const DEFAULT_SCHEMA_DOC = {
  schemaId: 'example.table',
  title: 'Example Table',
  fields: [
    {
      key: 'title',
      type: 'string',
      behavior: {
        fieldConfig: {
          fieldType: 'string',
          label: 'Title',
        },
      },
    },
  ],
} satisfies SchemaDoc;

const DEFAULT_WORKFLOW_DOC = {
  workflowId: 'example.workflow',
  table: 'example.table',
  hook: 'afterCreate',
  nodes: [
    {
      nodeId: 'n1',
      type: 'action',
      actionId: 'example.action',
      input: {
        expression: {
          kind: 'ref',
          source: 'payload',
          path: [],
        },
      },
    },
  ],
  edges: [],
} satisfies WorkflowDoc;

function canonicalStringify(input: unknown) {
  return JSON.stringify(input, null, 2);
}

function toLatestSeedReleases() {
  const map = new Map<string, (typeof MARKETPLACE_SEED_RELEASES)[number]>();
  for (const release of MARKETPLACE_SEED_RELEASES) {
    const existing = map.get(release.pluginId);
    if (!existing || release.version > existing.version) {
      map.set(release.pluginId, release);
    }
  }
  return [...map.values()].sort((left, right) =>
    left.pluginId.localeCompare(right.pluginId),
  );
}

function titleToPluginId(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return slug.length > 0 ? `plugin.${slug}` : 'example.plugin';
}

function bumpPatchVersion(version: string) {
  const [major, minor, patch] = version.split('.').map((part) => Number(part));
  if (
    Number.isNaN(major) ||
    Number.isNaN(minor) ||
    Number.isNaN(patch) ||
    major < 0 ||
    minor < 0 ||
    patch < 0
  ) {
    return '1.0.0';
  }
  return `${major}.${minor}.${patch + 1}`;
}

function getNextVersion(releases: PluginReleaseDoc[], currentPluginId: string) {
  const versions = releases
    .filter((release) => release.pluginId === currentPluginId)
    .map((release) => release.version)
    .filter((candidate) => /^\d+\.\d+\.\d+$/.test(candidate));

  if (versions.length === 0) {
    return '1.0.0';
  }

  const sorted = versions.sort((left, right) => {
    const leftParts = left.split('.').map(Number);
    const rightParts = right.split('.').map(Number);
    if (leftParts[0] !== rightParts[0]) return leftParts[0] - rightParts[0];
    if (leftParts[1] !== rightParts[1]) return leftParts[1] - rightParts[1];
    return leftParts[2] - rightParts[2];
  });

  return bumpPatchVersion(sorted[sorted.length - 1] ?? '0.0.0');
}

function parseJsonObject(value: string | undefined) {
  if (!value || value.trim() === '') return undefined;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return undefined;
    }
    return parsed as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

const BUILDER_FIELD_TYPES = [
  ...AUTOFORM_FIELD_TYPES,
  'enum',
  'array',
  'object',
] as const;
const BUILDER_LEAF_FIELD_TYPES = BUILDER_FIELD_TYPES.filter(
  (fieldType) => fieldType !== 'array' && fieldType !== 'object',
) as BuilderLeafFieldType[];

const CHOICE_FIELD_TYPES = new Set<BuilderFieldType>(['select', 'enum']);
const NUMERIC_FIELD_TYPES = new Set<BuilderFieldType>([
  'number',
  'currency',
  'slider',
  'rating',
  'timestamp',
]);
const ORDERABLE_FIELD_TYPES = new Set<BuilderFieldType>([
  'number',
  'currency',
  'slider',
  'rating',
  'timestamp',
  'date',
  'datetime',
]);

function generateBuilderId() {
  return `id_${Math.random().toString(36).slice(2, 10)}`;
}

function parseCommaSeparatedValues(value: string | undefined) {
  return (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isChoiceFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? CHOICE_FIELD_TYPES.has(fieldType) : false;
}

function isNumericFieldType(fieldType: BuilderFieldType | undefined) {
  return fieldType ? NUMERIC_FIELD_TYPES.has(fieldType) : false;
}

function getAllowedOperators(
  fieldType: BuilderFieldType | undefined,
): RuleOperator[] {
  if (fieldType && ORDERABLE_FIELD_TYPES.has(fieldType)) {
    return ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'];
  }
  return ['eq', 'neq'];
}

function getBlocklyPresets(fieldType: BuilderFieldType | undefined) {
  if (fieldType && ORDERABLE_FIELD_TYPES.has(fieldType)) {
    return [
      {
        label: 'Must Match',
        operator: 'eq' as RuleOperator,
        message: 'Values must match.',
      },
      {
        label: 'Must Be Different',
        operator: 'neq' as RuleOperator,
        message: 'Values must be different.',
      },
      {
        label: 'Must Be Greater',
        operator: 'gt' as RuleOperator,
        message: 'Value must be greater.',
      },
      {
        label: 'Must Be Greater Or Equal',
        operator: 'gte' as RuleOperator,
        message: 'Value must be greater than or equal.',
      },
      {
        label: 'Must Be Less',
        operator: 'lt' as RuleOperator,
        message: 'Value must be less.',
      },
      {
        label: 'Must Be Less Or Equal',
        operator: 'lte' as RuleOperator,
        message: 'Value must be less than or equal.',
      },
    ];
  }

  return [
    {
      label: 'Must Match',
      operator: 'eq' as RuleOperator,
      message: 'Values must match.',
    },
    {
      label: 'Must Be Different',
      operator: 'neq' as RuleOperator,
      message: 'Values must be different.',
    },
  ];
}

function parseDefaultValue(
  rawValue: string | undefined,
  type: BuilderFieldType,
) {
  if (rawValue === undefined || rawValue.trim() === '') {
    return undefined;
  }

  if (type === 'boolean') {
    if (rawValue === 'true') return true;
    if (rawValue === 'false') return false;
  }

  if (isNumericFieldType(type)) {
    const numericValue = Number(rawValue);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  try {
    return JSON.parse(rawValue) as unknown;
  } catch {
    return rawValue;
  }
}

function isInvalidObjectJson(rawValue: string | undefined) {
  return (
    (rawValue ?? '').trim().length > 0 &&
    parseJsonObject(rawValue) === undefined
  );
}

type BuilderField = {
  id: string;
  key: string;
  label: string;
  description: string;
  type: BuilderFieldType;
  fieldType?: (typeof AUTOFORM_FIELD_TYPES)[number];
  required: boolean;
  min?: string;
  max?: string;
  defaultValue?: string;
  enumValuesText?: string;
  fieldConfigJson?: string;
  inputPropsJson?: string;
  customDataJson?: string;
  arrayItemType?: BuilderLeafFieldType;
  arrayItemEnumValuesText?: string;
  objectFields?: BuilderObjectField[];
  useInt?: boolean;
  usePositive?: boolean;
  useNonNegative?: boolean;
};

type BuilderSchema = {
  schemaId: string;
  title: string;
  fields: BuilderField[];
};

type BuilderRefinement = {
  id: string;
  leftField: string;
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
  rightField: string;
  message: string;
};

type RuleOperator = BuilderRefinement['operator'];

type BlocklyDraft = {
  fieldId: string | null;
  operator: RuleOperator;
  rightField: string;
  message: string;
};

type BuilderFieldType =
  | (typeof AUTOFORM_FIELD_TYPES)[number]
  | 'enum'
  | 'array'
  | 'object';

type BuilderLeafFieldType = Exclude<BuilderFieldType, 'array' | 'object'>;

type BuilderObjectField = {
  id: string;
  key: string;
  label: string;
  description: string;
  type: BuilderLeafFieldType;
  required: boolean;
  enumValuesText?: string;
};

type HashPreviewInput = {
  pluginId: string;
  version: string;
  docs: {
    title: string;
    description: string;
  };
  actionManifest: ActionManifestDoc[];
  schemaDocs: SchemaDoc[];
  workflows: WorkflowDoc[];
  adminTabs: AdminTabDoc[];
};

function toObjectFieldDoc(field: BuilderObjectField): SchemaFieldDoc {
  return {
    key: field.key || 'field_key',
    type: field.type,
    description: field.description || undefined,
    optional: !field.required,
    enumValues: isChoiceFieldType(field.type)
      ? parseCommaSeparatedValues(field.enumValuesText)
      : undefined,
    behavior: {
      fieldConfig: {
        fieldType: field.type,
        label: field.label || field.key || 'Field',
        description: field.description || undefined,
      },
    },
  };
}

function toSchemaFieldDoc(field: BuilderField): SchemaFieldDoc {
  const parseNumeric = (value: string | undefined) => {
    if (!value) return undefined;
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  };

  const resolvedFieldType =
    field.fieldType ??
    (AUTOFORM_FIELD_TYPES.includes(
      field.type as (typeof AUTOFORM_FIELD_TYPES)[number],
    )
      ? (field.type as (typeof AUTOFORM_FIELD_TYPES)[number])
      : undefined);

  const fieldConfig = {
    ...(parseJsonObject(field.fieldConfigJson) ?? {}),
    ...(resolvedFieldType ? { fieldType: resolvedFieldType } : {}),
    label: field.label || field.key || 'Field',
    description: field.description || undefined,
    ...(parseJsonObject(field.inputPropsJson)
      ? { inputProps: parseJsonObject(field.inputPropsJson) }
      : {}),
    ...(parseJsonObject(field.customDataJson)
      ? { customData: parseJsonObject(field.customDataJson) }
      : {}),
  };

  return {
    key: field.key || 'field_key',
    type: field.type,
    description: field.description || undefined,
    optional: !field.required,
    defaultValue: parseDefaultValue(field.defaultValue, field.type),
    enumValues: isChoiceFieldType(field.type)
      ? parseCommaSeparatedValues(field.enumValuesText)
      : undefined,
    itemType:
      field.type === 'array'
        ? {
            type: field.arrayItemType ?? 'string',
            enumValues: isChoiceFieldType(field.arrayItemType)
              ? parseCommaSeparatedValues(field.arrayItemEnumValuesText)
              : undefined,
            behavior: {
              fieldConfig: {
                fieldType: field.arrayItemType ?? 'string',
              },
            },
          }
        : undefined,
    fields:
      field.type === 'object'
        ? (field.objectFields ?? []).map((nestedField) =>
            toObjectFieldDoc(nestedField),
          )
        : undefined,
    behavior: {
      fieldConfig,
    },
    rules: [
      ...(parseNumeric(field.min) !== undefined
        ? [{ kind: 'min' as const, value: parseNumeric(field.min) }]
        : []),
      ...(parseNumeric(field.max) !== undefined
        ? [{ kind: 'max' as const, value: parseNumeric(field.max) }]
        : []),
      ...(field.useInt ? [{ kind: 'int' as const }] : []),
      ...(field.usePositive ? [{ kind: 'positive' as const }] : []),
      ...(field.useNonNegative ? [{ kind: 'nonnegative' as const }] : []),
    ],
  };
}

function hasFieldValidationErrors(field: BuilderField) {
  if (!field.key.trim()) return true;
  if (
    isChoiceFieldType(field.type) &&
    parseCommaSeparatedValues(field.enumValuesText).length === 0
  ) {
    return true;
  }
  if (field.type === 'array' && !field.arrayItemType) return true;
  if (
    field.type === 'array' &&
    isChoiceFieldType(field.arrayItemType) &&
    parseCommaSeparatedValues(field.arrayItemEnumValuesText).length === 0
  ) {
    return true;
  }
  if (
    field.type === 'object' &&
    ((field.objectFields ?? []).length === 0 ||
      field.objectFields?.some(
        (nestedField) =>
          !nestedField.key.trim() ||
          (isChoiceFieldType(nestedField.type) &&
            parseCommaSeparatedValues(nestedField.enumValuesText).length === 0),
      ))
  ) {
    return true;
  }
  if (isInvalidObjectJson(field.inputPropsJson)) return true;
  if (isInvalidObjectJson(field.customDataJson)) return true;
  if (isInvalidObjectJson(field.fieldConfigJson)) return true;
  return false;
}

function PluginStudioRoute() {
  const { user, isAuthenticated } = useAuth();
  const { fire: fireConfetti } = useConfetti();
  const actorUserId = user?.pub ?? 'anon';
  const [pluginId, setPluginId] = useState('example.plugin');
  const [title, setTitle] = useState('Example Plugin');
  const [description, setDescription] = useState('Operational plugin release.');
  const [schemaText, setSchemaText] = useState(
    canonicalStringify([DEFAULT_SCHEMA_DOC]),
  );
  const [workflowText, setWorkflowText] = useState(
    canonicalStringify([DEFAULT_WORKFLOW_DOC]),
  );
  const [actionManifestText, setActionManifestText] = useState(
    canonicalStringify([]),
  );
  const [selectedTemplateLabel, setSelectedTemplateLabel] = useState<
    string | null
  >(null);
  const [schemaBuilder, setSchemaBuilder] = useState<BuilderSchema>({
    schemaId: DEFAULT_SCHEMA_DOC.schemaId,
    title: DEFAULT_SCHEMA_DOC.title,
    fields: [
      {
        id: generateBuilderId(),
        key: 'title',
        label: 'Title',
        description: '',
        type: 'string',
        fieldType: 'string',
        required: true,
        inputPropsJson: '{}',
        customDataJson: '{}',
        fieldConfigJson: '{}',
      },
    ],
  });
  const [schemaRefinements, setSchemaRefinements] = useState<
    BuilderRefinement[]
  >([]);
  const [blocklyDraft, setBlocklyDraft] = useState<BlocklyDraft>({
    fieldId: null,
    operator: 'eq',
    rightField: '',
    message: 'Validation rule failed',
  });
  const [isBlocklyComposerOpen, setIsBlocklyComposerOpen] = useState(false);
  const [debouncedHashInput, setDebouncedHashInput] =
    useState<HashPreviewInput | null>(null);
  const seededActorRef = useRef<string | null>(null);

  const {
    data: releaseRows = [],
    isLoading: isReleaseLoading,
    refetch: refetchReleases,
  } = api.pluginRelease.useGet();
  const releases = releaseRows as PluginReleaseDoc[];

  const parsed = useMemo(() => {
    try {
      const schemaDocs = JSON.parse(schemaText) as SchemaDoc[];
      const workflows = JSON.parse(workflowText) as WorkflowDoc[];
      const actionManifest = JSON.parse(
        actionManifestText,
      ) as ActionManifestDoc[];
      const adminTabs: AdminTabDoc[] = schemaDocs.map((doc) => ({
        schema: doc.schemaId,
        title: doc.title,
      }));
      return {
        schemaDocs,
        workflows,
        actionManifest,
        adminTabs,
      };
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }, [schemaText, workflowText, actionManifestText]);

  const isValidInputs = useMemo(() => {
    const hasInvalidFieldConfig = schemaBuilder.fields.some((field) =>
      hasFieldValidationErrors(field),
    );

    return (
      pluginId.trim() &&
      /^[a-z0-9][a-z0-9_.-]*[a-z0-9]$/.test(pluginId) &&
      parsed &&
      !hasInvalidFieldConfig
    );
  }, [parsed, pluginId, schemaBuilder.fields]);

  const { mutate: seedMarketplace } = useMutation({
    mutationKey: ['plugin-studio', 'seed-marketplace'],
    mutationFn: async (nextActorUserId: string) =>
      ensureMarketplaceSeedReleases({
        data: {
          actorUserId: nextActorUserId,
        },
      }),
    onSuccess: () => {
      void refetchReleases();
    },
    onError: (error) => {
      console.error(error);
      toast.error('Marketplace template sync failed.');
    },
  });

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    if (seededActorRef.current === actorUserId) {
      return;
    }
    seededActorRef.current = actorUserId;
    seedMarketplace(actorUserId);
  }, [actorUserId, isAuthenticated, seedMarketplace, user]);

  useEffect(() => {
    if (!parsed) {
      setDebouncedHashInput(null);
      return;
    }

    const timeout = setTimeout(() => {
      setDebouncedHashInput({
        pluginId,
        version: getNextVersion(releases, pluginId),
        docs: {
          title,
          description,
        },
        actionManifest: parsed.actionManifest,
        schemaDocs: parsed.schemaDocs,
        workflows: parsed.workflows,
        adminTabs: parsed.adminTabs,
      });
    }, 250);

    return () => {
      clearTimeout(timeout);
    };
  }, [description, parsed, pluginId, releases, title]);

  useEffect(() => {
    const fieldTypeByKey = new Map<string, BuilderFieldType>();
    const fieldsByType = new Map<BuilderFieldType, string[]>();
    for (const field of schemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      fieldTypeByKey.set(fieldKey, field.type);
      fieldsByType.set(field.type, [
        ...(fieldsByType.get(field.type) ?? []),
        fieldKey,
      ]);
    }

    const validRefinements = schemaRefinements.filter((rule) => {
      const leftFieldType = fieldTypeByKey.get(rule.leftField);
      if (!leftFieldType) return false;
      if (!getAllowedOperators(leftFieldType).includes(rule.operator))
        return false;
      const compatibleFields = (fieldsByType.get(leftFieldType) ?? []).filter(
        (fieldKey) => fieldKey !== rule.leftField,
      );
      return compatibleFields.includes(rule.rightField);
    });

    const nextSchemaDoc: SchemaDoc = {
      schemaId: schemaBuilder.schemaId || 'plugin.custom.table',
      title: schemaBuilder.title || 'Custom Schema',
      fields: schemaBuilder.fields.map((field) => toSchemaFieldDoc(field)),
      refinements: validRefinements.map((rule) => ({
        code: 'custom',
        path: rule.leftField ? [rule.leftField] : undefined,
        message: rule.message || 'Validation failed',
        when: {
          kind: 'op',
          op: 'not',
          args: [
            {
              kind: 'op',
              op: rule.operator,
              args: [
                { kind: 'ref', source: 'payload', path: [rule.leftField] },
                { kind: 'ref', source: 'payload', path: [rule.rightField] },
              ],
            },
          ],
        },
      })),
    };
    setSchemaText(canonicalStringify([nextSchemaDoc]));
  }, [schemaBuilder, schemaRefinements]);

  const hashPreviewQuery = useQuery({
    queryKey: ['plugin-studio', 'release-hash-preview', debouncedHashInput],
    enabled: debouncedHashInput !== null,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
    retry: 1,
    queryFn: async () => {
      if (!debouncedHashInput) {
        throw new Error('Missing release hash preview payload');
      }
      return previewPluginReleaseHashes({
        data: debouncedHashInput,
      });
    },
  });

  const { mutateAsync: publishRelease, isPending: isPublishing } = useMutation({
    mutationKey: ['plugin-studio', 'publish-release'],
    mutationFn: async () => {
      if (!parsed) {
        throw new Error('Invalid plugin payload');
      }
      return publishPluginRelease({
        data: {
          actorUserId,
          pluginId,
          version: getNextVersion(releases, pluginId),
          docs: {
            title,
            description,
          },
          actionManifest: parsed.actionManifest,
          schemaDocs: parsed.schemaDocs,
          workflows: parsed.workflows,
          adminTabs: parsed.adminTabs,
        },
      });
    },
    onSuccess: async () => {
      await refetchReleases();
      fireConfetti();
      toast.success(`${title} has been published.`);
    },
    onError: (error) => {
      console.error(error);
      toast.error('Publish failed');
    },
  });

  const templates = useMemo(() => toLatestSeedReleases(), []);
  const availableRuleFieldsByType = useMemo(() => {
    const byType = new Map<BuilderFieldType, string[]>();
    for (const field of schemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      const currentValues = byType.get(field.type) ?? [];
      byType.set(field.type, [...currentValues, fieldKey]);
    }
    return byType;
  }, [schemaBuilder.fields]);
  const fieldTypeByRuleField = useMemo(() => {
    const byField = new Map<string, BuilderFieldType>();
    for (const field of schemaBuilder.fields) {
      const fieldKey = field.key.trim();
      if (!fieldKey) continue;
      byField.set(fieldKey, field.type);
    }
    return byField;
  }, [schemaBuilder.fields]);
  const availableRuleFields = useMemo(
    () => [...fieldTypeByRuleField.keys()],
    [fieldTypeByRuleField],
  );
  const compatibleRuleFieldsByLeftField = useMemo(() => {
    const byField = new Map<string, string[]>();
    for (const fieldKey of availableRuleFields) {
      const leftType = fieldTypeByRuleField.get(fieldKey);
      const compatibleFields = leftType
        ? (availableRuleFieldsByType.get(leftType) ?? [])
        : [];
      byField.set(
        fieldKey,
        compatibleFields.filter(
          (candidateField) => candidateField !== fieldKey,
        ),
      );
    }
    return byField;
  }, [availableRuleFields, availableRuleFieldsByType, fieldTypeByRuleField]);
  const leftRuleFields = useMemo(
    () =>
      availableRuleFields.filter(
        (fieldKey) =>
          (compatibleRuleFieldsByLeftField.get(fieldKey)?.length ?? 0) > 0,
      ),
    [availableRuleFields, compatibleRuleFieldsByLeftField],
  );
  const isInitialLoading = isReleaseLoading && releases.length === 0;

  useEffect(() => {
    if (leftRuleFields.length === 0) {
      setSchemaRefinements((currentRules) =>
        currentRules.length === 0 ? currentRules : [],
      );
      return;
    }

    setSchemaRefinements((currentRules) => {
      let changed = false;
      const nextRules = currentRules.map((rule) => {
        const nextLeftField = leftRuleFields.includes(rule.leftField)
          ? rule.leftField
          : (leftRuleFields[0] ?? '');
        const leftType = fieldTypeByRuleField.get(nextLeftField);
        const compatibleFields = leftType
          ? (availableRuleFieldsByType.get(leftType) ?? []).filter(
              (fieldKey) => fieldKey !== nextLeftField,
            )
          : [];
        const nextRightField = compatibleFields.includes(rule.rightField)
          ? rule.rightField
          : (compatibleFields[0] ?? '');
        const allowedOperators = getAllowedOperators(leftType);
        const nextOperator = allowedOperators.includes(rule.operator)
          ? rule.operator
          : (allowedOperators[0] ?? 'eq');

        if (
          nextLeftField !== rule.leftField ||
          nextRightField !== rule.rightField ||
          nextOperator !== rule.operator
        ) {
          changed = true;
        }

        return {
          ...rule,
          leftField: nextLeftField,
          rightField: nextRightField,
          operator: nextOperator,
        };
      });

      return changed ? nextRules : currentRules;
    });
  }, [leftRuleFields, availableRuleFieldsByType, fieldTypeByRuleField]);

  const selectedBlocklyField = useMemo(
    () =>
      schemaBuilder.fields.find((field) => field.id === blocklyDraft.fieldId),
    [blocklyDraft.fieldId, schemaBuilder.fields],
  );
  const blocklyComparableFields = useMemo(() => {
    if (!selectedBlocklyField) return [];
    return schemaBuilder.fields
      .filter(
        (field) =>
          field.id !== selectedBlocklyField.id &&
          field.key.trim().length > 0 &&
          field.type === selectedBlocklyField.type,
      )
      .map((field) => field.key.trim());
  }, [schemaBuilder.fields, selectedBlocklyField]);
  const blocklyPresets = useMemo(
    () => getBlocklyPresets(selectedBlocklyField?.type),
    [selectedBlocklyField?.type],
  );

  function applyTemplatePreset(releaseId: string) {
    let parsedReleaseId = parseReleaseId(releaseId);

    if (!parsedReleaseId) {
      const parts = releaseId.split('@');
      if (parts.length === 2) {
        parsedReleaseId = { pluginId: parts[0], version: parts[1] };
      }
    }

    if (!parsedReleaseId) {
      toast.error('Failed to parse template release id.');
      return;
    }

    const template = MARKETPLACE_SEED_RELEASES.find(
      (release) =>
        release.pluginId === parsedReleaseId.pluginId &&
        release.version === parsedReleaseId.version,
    );

    if (!template) {
      toast.error('Template was not found.');
      return;
    }

    setPluginId(template.pluginId);
    setTitle(template.docs.title);
    setDescription(template.docs.description);
    setActionManifestText(canonicalStringify(template.actionManifest));
    const templatePrimaryTab = template.adminTabs[0];
    const workflowTable =
      templatePrimaryTab?.schema ?? DEFAULT_WORKFLOW_DOC.table;
    const firstAction = template.actionManifest[0];
    const workflowNodes = firstAction
      ? [
          {
            nodeId: 'n1',
            type: 'action' as const,
            actionId: firstAction.actionId,
            input: {
              expression: {
                kind: 'ref' as const,
                source: 'payload' as const,
                path: [],
              },
            },
          },
        ]
      : DEFAULT_WORKFLOW_DOC.nodes;

    setWorkflowText(
      canonicalStringify([
        {
          workflowId: `${template.pluginId}.workflow`,
          table: workflowTable,
          hook: 'afterCreate',
          nodes: workflowNodes,
          edges: [],
        },
      ]),
    );

    setSchemaBuilder({
      schemaId:
        templatePrimaryTab?.schema ??
        `plugin.${template.pluginId.split('.').pop() ?? 'custom'}.table`,
      title: templatePrimaryTab?.title ?? template.docs.title,
      fields: [
        {
          id: generateBuilderId(),
          key: 'name',
          label: 'Name',
          description: 'Primary label for this record.',
          type: 'string',
          fieldType: 'string',
          required: true,
          inputPropsJson: '{}',
          customDataJson: '{}',
          fieldConfigJson: '{}',
        },
        {
          id: generateBuilderId(),
          key: 'isActive',
          label: 'Active',
          description: 'Whether this item is enabled in the app.',
          type: 'boolean',
          fieldType: 'boolean',
          required: false,
          inputPropsJson: '{}',
          customDataJson: '{}',
          fieldConfigJson: '{}',
        },
      ],
    });
    setSchemaRefinements([]);
    setSelectedTemplateLabel(template.docs.title);
    fireConfetti();
    toast.success(`Loaded template ${template.docs.title}`);
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-12">
        <Card>
          <CardHeader>
            <CardTitle>Plugin Studio</CardTitle>
          </CardHeader>
          <CardContent>Sign in to access the plugin studio.</CardContent>
        </Card>
      </div>
    );
  }

  if (isInitialLoading) return <PluginStudioSkeleton />;

  return (
    <div className="w-full py-6">
      <div className="mx-auto w-full max-w-7xl px-4 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-background via-muted/30 to-background p-6 md:p-8">
          <div className="absolute -right-10 top-6 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
          <div className="absolute -left-10 bottom-0 h-44 w-44 rounded-full bg-accent/30 blur-2xl" />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground">
                <Sparkles className="size-3.5" />
                Plugin Studio
              </div>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Build Powerful Plugins With No Code.
              </h1>
              <p className="text-sm text-muted-foreground">
                Start from a template, customize your schema visually, and
                publish when ready.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="lg"
                disabled={!isValidInputs || isPublishing}
                onClick={() => {
                  if (!isValidInputs) return;
                  void publishRelease();
                }}
              >
                {isPublishing ? 'Publishing...' : 'Publish Plugin'}
                {!isPublishing && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </div>
          </div>
        </section>

        <Card className="border-border bg-gradient-to-br from-card via-card to-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wand2 className="size-4" />
              Starter Templates
            </CardTitle>
            <CardDescription>
              Choose a starter. It preloads plugin behavior instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.map((template) => (
              <div
                key={`${template.pluginId}@${template.version}`}
                className={`rounded-xl border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  selectedTemplateLabel === template.docs.title
                    ? 'ring-2 ring-primary'
                    : ''
                }`}
              >
                <div className="space-y-0.5">
                  <div className="font-medium text-sm">
                    {template.docs.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.pluginId}
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {template.docs.description}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  onClick={() =>
                    applyTemplatePreset(
                      `${template.pluginId}@${template.version}`,
                    )
                  }
                >
                  <BadgePlus className="mr-2 size-4" />
                  Load Template
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No-Code Builder</CardTitle>
              <CardDescription>
                Configure your plugin with guided controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Plugin Name
                </div>
                <Input
                  value={title}
                  onChange={(event) => {
                    const nextTitle = event.target.value;
                    setTitle(nextTitle);
                    if (
                      pluginId === 'example.plugin' ||
                      pluginId.startsWith('plugin.')
                    ) {
                      setPluginId(titleToPluginId(nextTitle));
                    }
                  }}
                  placeholder="Plugin title"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Plugin Description
                </div>
                <Input
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="What does your plugin do?"
                />
              </div>
              {selectedTemplateLabel && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm text-foreground">
                  Template applied:{' '}
                  <span className="font-medium">{selectedTemplateLabel}</span>
                </div>
              )}
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Schema Builder</div>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => {
                      setSchemaBuilder((current) => ({
                        ...current,
                        fields: [
                          ...current.fields,
                          {
                            id: generateBuilderId(),
                            key: `field_${current.fields.length + 1}`,
                            label: `Field ${current.fields.length + 1}`,
                            description: '',
                            type: 'string',
                            fieldType: 'string',
                            required: false,
                            fieldConfigJson: '{}',
                            inputPropsJson: '{}',
                            customDataJson: '{}',
                          },
                        ],
                      }));
                    }}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Field
                  </Button>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Schema ID
                  </div>
                  <Input
                    value={schemaBuilder.schemaId}
                    onChange={(event) =>
                      setSchemaBuilder((current) => ({
                        ...current,
                        schemaId: event.target.value,
                      }))
                    }
                    placeholder="Schema ID (e.g. plugin.orders)"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Schema Title
                  </div>
                  <Input
                    value={schemaBuilder.title}
                    onChange={(event) =>
                      setSchemaBuilder((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Schema title"
                  />
                </div>
                <div className="space-y-2">
                  {schemaBuilder.fields.map((field, fieldIndex) => {
                    const choiceFieldType = isChoiceFieldType(field.type);
                    const showMinMax =
                      isNumericFieldType(field.type) ||
                      field.type === 'string' ||
                      field.type === 'array' ||
                      field.type === 'tags';
                    const keyInvalid = !field.key.trim();
                    const enumValuesMissing =
                      choiceFieldType &&
                      parseCommaSeparatedValues(field.enumValuesText).length ===
                        0;
                    const inputPropsInvalid = isInvalidObjectJson(
                      field.inputPropsJson,
                    );
                    const customDataInvalid = isInvalidObjectJson(
                      field.customDataJson,
                    );
                    const fieldConfigInvalid = isInvalidObjectJson(
                      field.fieldConfigJson,
                    );
                    const arrayItemOptionsMissing =
                      field.type === 'array' &&
                      isChoiceFieldType(field.arrayItemType) &&
                      parseCommaSeparatedValues(field.arrayItemEnumValuesText)
                        .length === 0;
                    const objectFieldsMissing =
                      field.type === 'object' &&
                      (field.objectFields ?? []).length === 0;

                    return (
                      <div
                        key={field.id}
                        className="rounded-lg border bg-muted/20 p-3"
                      >
                        <div className="grid gap-2 md:grid-cols-3">
                          <Input
                            value={field.key}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          key: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            className={keyInvalid ? 'border-destructive' : ''}
                            placeholder="Field key"
                          />
                          <Input
                            value={field.label}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          label: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            placeholder="Field label"
                          />
                          <Input
                            value={field.description}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          description: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            placeholder="Field help text"
                          />
                          <Select
                            value={field.type}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) => {
                                    if (nextIndex !== fieldIndex) {
                                      return nextField;
                                    }
                                    const nextType = value as BuilderFieldType;
                                    return {
                                      ...nextField,
                                      type: nextType,
                                      fieldType: AUTOFORM_FIELD_TYPES.includes(
                                        nextType as (typeof AUTOFORM_FIELD_TYPES)[number],
                                      )
                                        ? (nextType as (typeof AUTOFORM_FIELD_TYPES)[number])
                                        : (nextField.fieldType ?? 'string'),
                                      arrayItemType:
                                        nextType === 'array'
                                          ? (nextField.arrayItemType ??
                                            'string')
                                          : nextField.arrayItemType,
                                      objectFields:
                                        nextType === 'object'
                                          ? (nextField.objectFields ?? [])
                                          : nextField.objectFields,
                                    };
                                  },
                                ),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Field type" />
                            </SelectTrigger>
                            <SelectContent>
                              {BUILDER_FIELD_TYPES.map((fieldType) => (
                                <SelectItem key={fieldType} value={fieldType}>
                                  {fieldType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={field.fieldType ?? 'string'}
                            onValueChange={(value) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          fieldType:
                                            value as (typeof AUTOFORM_FIELD_TYPES)[number],
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="AutoForm component type" />
                            </SelectTrigger>
                            <SelectContent>
                              {AUTOFORM_FIELD_TYPES.map((fieldType) => (
                                <SelectItem key={fieldType} value={fieldType}>
                                  {fieldType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Checkbox
                              checked={field.required}
                              onCheckedChange={(checked) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (nextField, nextIndex) =>
                                      nextIndex === fieldIndex
                                        ? {
                                            ...nextField,
                                            required: checked === true,
                                          }
                                        : nextField,
                                  ),
                                }))
                              }
                            />
                            <span>Required</span>
                          </div>
                          {showMinMax && (
                            <>
                              <Input
                                type="number"
                                value={field.min ?? ''}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (nextField, nextIndex) =>
                                        nextIndex === fieldIndex
                                          ? {
                                              ...nextField,
                                              min:
                                                event.target.value || undefined,
                                            }
                                          : nextField,
                                    ),
                                  }))
                                }
                                placeholder="Min constraint"
                              />
                              <Input
                                type="number"
                                value={field.max ?? ''}
                                onChange={(event) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (nextField, nextIndex) =>
                                        nextIndex === fieldIndex
                                          ? {
                                              ...nextField,
                                              max:
                                                event.target.value || undefined,
                                            }
                                          : nextField,
                                    ),
                                  }))
                                }
                                placeholder="Max constraint"
                              />
                            </>
                          )}
                          <Input
                            value={field.defaultValue ?? ''}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          defaultValue:
                                            event.target.value || undefined,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            placeholder="Default value (optional)"
                          />
                          {choiceFieldType && (
                            <Input
                              value={field.enumValuesText ?? ''}
                              onChange={(event) =>
                                setSchemaBuilder((current) => ({
                                  ...current,
                                  fields: current.fields.map(
                                    (nextField, nextIndex) =>
                                      nextIndex === fieldIndex
                                        ? {
                                            ...nextField,
                                            enumValuesText: event.target.value,
                                          }
                                        : nextField,
                                  ),
                                }))
                              }
                              className={
                                enumValuesMissing ? 'border-destructive' : ''
                              }
                              placeholder="Enum values: draft,published,archived"
                            />
                          )}
                          {field.type === 'array' && (
                            <>
                              <Select
                                value={field.arrayItemType ?? 'string'}
                                onValueChange={(value) =>
                                  setSchemaBuilder((current) => ({
                                    ...current,
                                    fields: current.fields.map(
                                      (nextField, nextIndex) =>
                                        nextIndex === fieldIndex
                                          ? {
                                              ...nextField,
                                              arrayItemType:
                                                value as BuilderLeafFieldType,
                                            }
                                          : nextField,
                                    ),
                                  }))
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Array item type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {BUILDER_LEAF_FIELD_TYPES.map((fieldType) => (
                                    <SelectItem
                                      key={`array-${fieldType}`}
                                      value={fieldType}
                                    >
                                      {fieldType}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isChoiceFieldType(field.arrayItemType) && (
                                <Input
                                  value={field.arrayItemEnumValuesText ?? ''}
                                  onChange={(event) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (nextField, nextIndex) =>
                                          nextIndex === fieldIndex
                                            ? {
                                                ...nextField,
                                                arrayItemEnumValuesText:
                                                  event.target.value,
                                              }
                                            : nextField,
                                      ),
                                    }))
                                  }
                                  className={
                                    arrayItemOptionsMissing
                                      ? 'border-destructive'
                                      : ''
                                  }
                                  placeholder="Array item enum values"
                                />
                              )}
                            </>
                          )}
                          <Input
                            value={field.fieldConfigJson ?? '{}'}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          fieldConfigJson: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            className={
                              fieldConfigInvalid ? 'border-destructive' : ''
                            }
                            placeholder="Field Config JSON (advanced serializable config)"
                          />
                          <Input
                            value={field.inputPropsJson ?? '{}'}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          inputPropsJson: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            className={
                              inputPropsInvalid ? 'border-destructive' : ''
                            }
                            placeholder='Input Props JSON (e.g. {"placeholder":"Name"})'
                          />
                          <Input
                            value={field.customDataJson ?? '{}'}
                            onChange={(event) =>
                              setSchemaBuilder((current) => ({
                                ...current,
                                fields: current.fields.map(
                                  (nextField, nextIndex) =>
                                    nextIndex === fieldIndex
                                      ? {
                                          ...nextField,
                                          customDataJson: event.target.value,
                                        }
                                      : nextField,
                                ),
                              }))
                            }
                            className={
                              customDataInvalid ? 'border-destructive' : ''
                            }
                            placeholder="Custom Data JSON (sources/options/tabs)"
                          />
                          {isNumericFieldType(field.type) && (
                            <>
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <Checkbox
                                  checked={field.useInt ?? false}
                                  onCheckedChange={(checked) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (nextField, nextIndex) =>
                                          nextIndex === fieldIndex
                                            ? {
                                                ...nextField,
                                                useInt: checked === true,
                                              }
                                            : nextField,
                                      ),
                                    }))
                                  }
                                />
                                <span>Integer only</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <Checkbox
                                  checked={field.usePositive ?? false}
                                  onCheckedChange={(checked) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (nextField, nextIndex) =>
                                          nextIndex === fieldIndex
                                            ? {
                                                ...nextField,
                                                usePositive: checked === true,
                                              }
                                            : nextField,
                                      ),
                                    }))
                                  }
                                />
                                <span>Positive only</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                <Checkbox
                                  checked={field.useNonNegative ?? false}
                                  onCheckedChange={(checked) =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (nextField, nextIndex) =>
                                          nextIndex === fieldIndex
                                            ? {
                                                ...nextField,
                                                useNonNegative:
                                                  checked === true,
                                              }
                                            : nextField,
                                      ),
                                    }))
                                  }
                                />
                                <span>Non-negative</span>
                              </div>
                            </>
                          )}
                          {field.type === 'object' && (
                            <div className="space-y-2 rounded-lg border bg-card p-3 md:col-span-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-medium">
                                  Object Fields
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.map(
                                        (nextField, nextIndex) =>
                                          nextIndex === fieldIndex
                                            ? {
                                                ...nextField,
                                                objectFields: [
                                                  ...(nextField.objectFields ??
                                                    []),
                                                  {
                                                    id: generateBuilderId(),
                                                    key: `nested_${(nextField.objectFields ?? []).length + 1}`,
                                                    label: 'Nested Field',
                                                    description: '',
                                                    type: 'string',
                                                    required: false,
                                                  },
                                                ],
                                              }
                                            : nextField,
                                      ),
                                    }))
                                  }
                                >
                                  <Plus className="mr-2 size-4" />
                                  Add Object Field
                                </Button>
                              </div>
                              {(field.objectFields ?? []).map(
                                (nestedField, nestedIndex) => (
                                  <div
                                    key={nestedField.id}
                                    className="grid gap-2 rounded-md border bg-muted/20 p-2 md:grid-cols-5"
                                  >
                                    <Input
                                      value={nestedField.key}
                                      onChange={(event) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (nextField, nextIndex) =>
                                              nextIndex === fieldIndex
                                                ? {
                                                    ...nextField,
                                                    objectFields: (
                                                      nextField.objectFields ??
                                                      []
                                                    ).map(
                                                      (
                                                        nextNestedField,
                                                        nextNestedIndex,
                                                      ) =>
                                                        nextNestedIndex ===
                                                        nestedIndex
                                                          ? {
                                                              ...nextNestedField,
                                                              key: event.target
                                                                .value,
                                                            }
                                                          : nextNestedField,
                                                    ),
                                                  }
                                                : nextField,
                                          ),
                                        }))
                                      }
                                      placeholder="Nested key"
                                    />
                                    <Input
                                      value={nestedField.label}
                                      onChange={(event) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (nextField, nextIndex) =>
                                              nextIndex === fieldIndex
                                                ? {
                                                    ...nextField,
                                                    objectFields: (
                                                      nextField.objectFields ??
                                                      []
                                                    ).map(
                                                      (
                                                        nextNestedField,
                                                        nextNestedIndex,
                                                      ) =>
                                                        nextNestedIndex ===
                                                        nestedIndex
                                                          ? {
                                                              ...nextNestedField,
                                                              label:
                                                                event.target
                                                                  .value,
                                                            }
                                                          : nextNestedField,
                                                    ),
                                                  }
                                                : nextField,
                                          ),
                                        }))
                                      }
                                      placeholder="Nested label"
                                    />
                                    <Input
                                      value={nestedField.description}
                                      onChange={(event) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (nextField, nextIndex) =>
                                              nextIndex === fieldIndex
                                                ? {
                                                    ...nextField,
                                                    objectFields: (
                                                      nextField.objectFields ??
                                                      []
                                                    ).map(
                                                      (
                                                        nextNestedField,
                                                        nextNestedIndex,
                                                      ) =>
                                                        nextNestedIndex ===
                                                        nestedIndex
                                                          ? {
                                                              ...nextNestedField,
                                                              description:
                                                                event.target
                                                                  .value,
                                                            }
                                                          : nextNestedField,
                                                    ),
                                                  }
                                                : nextField,
                                          ),
                                        }))
                                      }
                                      placeholder="Nested description"
                                    />
                                    <Select
                                      value={nestedField.type}
                                      onValueChange={(value) =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (nextField, nextIndex) =>
                                              nextIndex === fieldIndex
                                                ? {
                                                    ...nextField,
                                                    objectFields: (
                                                      nextField.objectFields ??
                                                      []
                                                    ).map(
                                                      (
                                                        nextNestedField,
                                                        nextNestedIndex,
                                                      ) =>
                                                        nextNestedIndex ===
                                                        nestedIndex
                                                          ? {
                                                              ...nextNestedField,
                                                              type: value as BuilderLeafFieldType,
                                                            }
                                                          : nextNestedField,
                                                    ),
                                                  }
                                                : nextField,
                                          ),
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Nested type" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {BUILDER_LEAF_FIELD_TYPES.map(
                                          (fieldType) => (
                                            <SelectItem
                                              key={`nested-${nestedField.id}-${fieldType}`}
                                              value={fieldType}
                                            >
                                              {fieldType}
                                            </SelectItem>
                                          ),
                                        )}
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setSchemaBuilder((current) => ({
                                          ...current,
                                          fields: current.fields.map(
                                            (nextField, nextIndex) =>
                                              nextIndex === fieldIndex
                                                ? {
                                                    ...nextField,
                                                    objectFields: (
                                                      nextField.objectFields ??
                                                      []
                                                    ).filter(
                                                      (_, nextNestedIndex) =>
                                                        nextNestedIndex !==
                                                        nestedIndex,
                                                    ),
                                                  }
                                                : nextField,
                                          ),
                                        }))
                                      }
                                    >
                                      Remove
                                    </Button>
                                    <div className="flex items-center gap-2 text-xs text-foreground">
                                      <Checkbox
                                        checked={nestedField.required}
                                        onCheckedChange={(checked) =>
                                          setSchemaBuilder((current) => ({
                                            ...current,
                                            fields: current.fields.map(
                                              (nextField, nextIndex) =>
                                                nextIndex === fieldIndex
                                                  ? {
                                                      ...nextField,
                                                      objectFields: (
                                                        nextField.objectFields ??
                                                        []
                                                      ).map(
                                                        (
                                                          nextNestedField,
                                                          nextNestedIndex,
                                                        ) =>
                                                          nextNestedIndex ===
                                                          nestedIndex
                                                            ? {
                                                                ...nextNestedField,
                                                                required:
                                                                  checked ===
                                                                  true,
                                                              }
                                                            : nextNestedField,
                                                      ),
                                                    }
                                                  : nextField,
                                            ),
                                          }))
                                        }
                                      />
                                      <span>Required</span>
                                    </div>
                                    {isChoiceFieldType(nestedField.type) && (
                                      <Input
                                        value={nestedField.enumValuesText ?? ''}
                                        onChange={(event) =>
                                          setSchemaBuilder((current) => ({
                                            ...current,
                                            fields: current.fields.map(
                                              (nextField, nextIndex) =>
                                                nextIndex === fieldIndex
                                                  ? {
                                                      ...nextField,
                                                      objectFields: (
                                                        nextField.objectFields ??
                                                        []
                                                      ).map(
                                                        (
                                                          nextNestedField,
                                                          nextNestedIndex,
                                                        ) =>
                                                          nextNestedIndex ===
                                                          nestedIndex
                                                            ? {
                                                                ...nextNestedField,
                                                                enumValuesText:
                                                                  event.target
                                                                    .value,
                                                              }
                                                            : nextNestedField,
                                                      ),
                                                    }
                                                  : nextField,
                                            ),
                                          }))
                                        }
                                        className="md:col-span-5"
                                        placeholder="Nested enum values"
                                      />
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                        <div className="mt-2 space-y-1">
                          {keyInvalid && (
                            <p className="text-xs text-destructive">
                              Field key is required.
                            </p>
                          )}
                          {enumValuesMissing && (
                            <p className="text-xs text-destructive">
                              Enum/select fields must include at least one
                              option.
                            </p>
                          )}
                          {arrayItemOptionsMissing && (
                            <p className="text-xs text-destructive">
                              Array item enum/select requires option values.
                            </p>
                          )}
                          {objectFieldsMissing && (
                            <p className="text-xs text-destructive">
                              Object fields need at least one nested field.
                            </p>
                          )}
                          {fieldConfigInvalid && (
                            <p className="text-xs text-destructive">
                              Field Config JSON must be a valid object.
                            </p>
                          )}
                          {inputPropsInvalid && (
                            <p className="text-xs text-destructive">
                              Input Props JSON must be a valid object.
                            </p>
                          )}
                          {customDataInvalid && (
                            <p className="text-xs text-destructive">
                              Custom Data JSON must be a valid object.
                            </p>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={!field.key.trim()}
                            onClick={() => {
                              const comparableFieldKeys = schemaBuilder.fields
                                .filter(
                                  (nextField) =>
                                    nextField.id !== field.id &&
                                    nextField.type === field.type &&
                                    nextField.key.trim().length > 0,
                                )
                                .map((nextField) => nextField.key.trim());
                              const presets = getBlocklyPresets(field.type);
                              setBlocklyDraft({
                                fieldId: field.id,
                                operator:
                                  presets[0]?.operator ??
                                  getAllowedOperators(field.type)[0] ??
                                  'eq',
                                rightField: comparableFieldKeys[0] ?? '',
                                message:
                                  presets[0]?.message ??
                                  `${field.label || field.key} validation failed`,
                              });
                              setIsBlocklyComposerOpen(true);
                            }}
                          >
                            Compose Logic
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={schemaBuilder.fields.length === 1}
                              >
                                <Trash2 className="mr-2 size-4 text-destructive" />
                                Remove Field
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Remove this field?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove the field and its
                                  validations.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    setSchemaBuilder((current) => ({
                                      ...current,
                                      fields: current.fields.filter(
                                        (_, nextIndex) =>
                                          nextIndex !== fieldIndex,
                                      ),
                                    }))
                                  }
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-2 rounded-xl border bg-muted/20 p-3 text-sm md:grid-cols-3">
                <div>
                  <div className="text-muted-foreground">Schemas</div>
                  <div className="font-semibold">
                    {parsed?.schemaDocs.length ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Workflows</div>
                  <div className="font-semibold">
                    {parsed?.workflows.length ?? 0}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Actions</div>
                  <div className="font-semibold">
                    {parsed?.actionManifest.length ?? 0}
                  </div>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Cross-Field Validation Rules
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    onClick={() =>
                      setSchemaRefinements((current) => {
                        const leftField = leftRuleFields[0] ?? '';
                        const firstType = fieldTypeByRuleField.get(leftField);
                        const compatibleFields = firstType
                          ? (
                              availableRuleFieldsByType.get(firstType) ?? []
                            ).filter((fieldKey) => fieldKey !== leftField)
                          : [];
                        const rightField = compatibleFields[0] ?? '';
                        const operator =
                          getAllowedOperators(firstType)[0] ?? 'eq';
                        return [
                          ...current,
                          {
                            id: generateBuilderId(),
                            leftField,
                            operator,
                            rightField,
                            message: 'Validation rule failed',
                          },
                        ];
                      })
                    }
                    disabled={leftRuleFields.length === 0}
                  >
                    <Plus className="mr-2 size-4" />
                    Add Rule
                  </Button>
                </div>
                {schemaRefinements.length === 0 ? (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Add rules like “endDate must be greater than startDate”
                      without code.
                    </p>
                    {leftRuleFields.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Create at least two fields with the same data type to
                        enable cross-field rules.
                      </p>
                    )}
                  </div>
                ) : (
                  schemaRefinements.map((rule) => {
                    const leftFieldType = fieldTypeByRuleField.get(
                      rule.leftField,
                    );
                    const compatibleFields = leftFieldType
                      ? (
                          availableRuleFieldsByType.get(leftFieldType) ?? []
                        ).filter((fieldKey) => fieldKey !== rule.leftField)
                      : [];
                    const allowedOperators = getAllowedOperators(leftFieldType);

                    return (
                      <div
                        key={rule.id}
                        className="rounded-lg border bg-muted/20 p-3"
                      >
                        <div className="grid gap-2 md:grid-cols-4">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Left Field
                            </div>
                            <Select
                              value={rule.leftField}
                              onValueChange={(value) =>
                                setSchemaRefinements((current) =>
                                  current.map((nextRule) => {
                                    if (nextRule.id !== rule.id)
                                      return nextRule;
                                    const nextType =
                                      fieldTypeByRuleField.get(value);
                                    const nextCompatibleFields = nextType
                                      ? (
                                          availableRuleFieldsByType.get(
                                            nextType,
                                          ) ?? []
                                        ).filter(
                                          (fieldKey) => fieldKey !== value,
                                        )
                                      : [];
                                    const nextOperators =
                                      getAllowedOperators(nextType);
                                    return {
                                      ...nextRule,
                                      leftField: value,
                                      rightField: nextCompatibleFields.includes(
                                        nextRule.rightField,
                                      )
                                        ? nextRule.rightField
                                        : (nextCompatibleFields[0] ?? ''),
                                      operator: nextOperators.includes(
                                        nextRule.operator,
                                      )
                                        ? nextRule.operator
                                        : (nextOperators[0] ?? 'eq'),
                                    };
                                  }),
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Left field" />
                              </SelectTrigger>
                              <SelectContent>
                                {leftRuleFields.map((fieldKey) => (
                                  <SelectItem
                                    key={`left-${rule.id}-${fieldKey}`}
                                    value={fieldKey}
                                  >
                                    {fieldKey}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Operator
                            </div>
                            <Select
                              value={rule.operator}
                              onValueChange={(value) =>
                                setSchemaRefinements((current) =>
                                  current.map((nextRule) =>
                                    nextRule.id === rule.id
                                      ? {
                                          ...nextRule,
                                          operator:
                                            value as BuilderRefinement['operator'],
                                        }
                                      : nextRule,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Rule operator" />
                              </SelectTrigger>
                              <SelectContent>
                                {allowedOperators.includes('eq') && (
                                  <SelectItem value="eq">equals</SelectItem>
                                )}
                                {allowedOperators.includes('neq') && (
                                  <SelectItem value="neq">
                                    not equals
                                  </SelectItem>
                                )}
                                {allowedOperators.includes('gt') && (
                                  <SelectItem value="gt">
                                    greater than
                                  </SelectItem>
                                )}
                                {allowedOperators.includes('gte') && (
                                  <SelectItem value="gte">
                                    greater than or equal
                                  </SelectItem>
                                )}
                                {allowedOperators.includes('lt') && (
                                  <SelectItem value="lt">less than</SelectItem>
                                )}
                                {allowedOperators.includes('lte') && (
                                  <SelectItem value="lte">
                                    less than or equal
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Right Field
                            </div>
                            <Select
                              value={rule.rightField}
                              onValueChange={(value) =>
                                setSchemaRefinements((current) =>
                                  current.map((nextRule) =>
                                    nextRule.id === rule.id
                                      ? { ...nextRule, rightField: value }
                                      : nextRule,
                                  ),
                                )
                              }
                            >
                              <SelectTrigger
                                className="w-full"
                                disabled={compatibleFields.length === 0}
                              >
                                <SelectValue placeholder="Right field" />
                              </SelectTrigger>
                              <SelectContent>
                                {compatibleFields.map((fieldKey) => (
                                  <SelectItem
                                    key={`right-${rule.id}-${fieldKey}`}
                                    value={fieldKey}
                                  >
                                    {fieldKey}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {compatibleFields.length === 0 && (
                              <p className="text-xs text-muted-foreground">
                                Add another field with the same type to compare
                                against.
                              </p>
                            )}
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Error Message
                            </div>
                            <Input
                              value={rule.message}
                              onChange={(event) =>
                                setSchemaRefinements((current) =>
                                  current.map((nextRule) =>
                                    nextRule.id === rule.id
                                      ? {
                                          ...nextRule,
                                          message: event.target.value,
                                        }
                                      : nextRule,
                                  ),
                                )
                              }
                              placeholder="Validation error shown to users"
                            />
                          </div>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="mt-2"
                            >
                              <Trash2 className="mr-2 size-4 text-destructive" />
                              Remove Rule
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove this rule?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This validation rule will no longer run.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  setSchemaRefinements((current) =>
                                    current.filter(
                                      (nextRule) => nextRule.id !== rule.id,
                                    ),
                                  )
                                }
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/80 bg-gradient-to-br from-card to-accent/20">
          <CardHeader>
            <CardTitle>Ready to Publish</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsed && hashPreviewQuery.data && (
              <p className="text-sm text-muted-foreground">
                Schema checks passed. Your plugin is ready to publish.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Advanced no-code logic is powered by field rules and cross-field
              validations above.
            </p>
          </CardContent>
        </Card>

        <Dialog
          open={isBlocklyComposerOpen}
          onOpenChange={setIsBlocklyComposerOpen}
        >
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Blockly Composer</DialogTitle>
              <DialogDescription>
                Compose advanced field logic with guided, type-safe building
                blocks.
              </DialogDescription>
            </DialogHeader>
            {!selectedBlocklyField ? (
              <p className="text-sm text-muted-foreground">
                Choose a field from the builder and click `Compose Logic`.
              </p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Field
                  </div>
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
                    {selectedBlocklyField.key}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Operator
                  </div>
                  <Select
                    value={blocklyDraft.operator}
                    onValueChange={(value) =>
                      setBlocklyDraft((current) => ({
                        ...current,
                        operator: value as RuleOperator,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Operator" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'eq',
                      ) && <SelectItem value="eq">equals</SelectItem>}
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'neq',
                      ) && <SelectItem value="neq">not equals</SelectItem>}
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'gt',
                      ) && <SelectItem value="gt">greater than</SelectItem>}
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'gte',
                      ) && (
                        <SelectItem value="gte">
                          greater than or equal
                        </SelectItem>
                      )}
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'lt',
                      ) && <SelectItem value="lt">less than</SelectItem>}
                      {getAllowedOperators(selectedBlocklyField.type).includes(
                        'lte',
                      ) && (
                        <SelectItem value="lte">less than or equal</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Preset Logic
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {blocklyPresets.map((preset) => (
                      <Button
                        key={`${preset.label}-${preset.operator}`}
                        type="button"
                        size="sm"
                        variant={
                          blocklyDraft.operator === preset.operator &&
                          blocklyDraft.message === preset.message
                            ? 'default'
                            : 'outline'
                        }
                        onClick={() =>
                          setBlocklyDraft((current) => ({
                            ...current,
                            operator: preset.operator,
                            message: preset.message,
                          }))
                        }
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Compare With Field
                  </div>
                  <Select
                    value={blocklyDraft.rightField}
                    onValueChange={(value) =>
                      setBlocklyDraft((current) => ({
                        ...current,
                        rightField: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a compatible field" />
                    </SelectTrigger>
                    <SelectContent>
                      {blocklyComparableFields.map((fieldKey) => (
                        <SelectItem
                          key={`blockly-${fieldKey}`}
                          value={fieldKey}
                        >
                          {fieldKey}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {blocklyComparableFields.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Add another field of type `{selectedBlocklyField.type}` to
                      compare against.
                    </p>
                  )}
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Error Message
                  </div>
                  <Input
                    value={blocklyDraft.message}
                    onChange={(event) =>
                      setBlocklyDraft((current) => ({
                        ...current,
                        message: event.target.value,
                      }))
                    }
                    placeholder="Message shown when this logic fails"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsBlocklyComposerOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (!selectedBlocklyField) return;
                  if (!blocklyDraft.rightField) return;
                  setSchemaRefinements((current) => [
                    ...current,
                    {
                      id: generateBuilderId(),
                      leftField: selectedBlocklyField.key,
                      operator: blocklyDraft.operator,
                      rightField: blocklyDraft.rightField,
                      message: blocklyDraft.message || 'Validation rule failed',
                    },
                  ]);
                  fireConfetti();
                  toast.success('Blockly logic added.');
                  setIsBlocklyComposerOpen(false);
                }}
                disabled={!selectedBlocklyField || !blocklyDraft.rightField}
              >
                Apply Logic
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function PluginStudioSkeleton() {
  const templateSkeletonIds = ['template-a', 'template-b', 'template-c'];
  const marketSkeletonIds = ['market-a', 'market-b', 'market-c', 'market-d'];
  const editorSkeletonIds = ['editor-a', 'editor-b', 'editor-c'];

  return (
    <div className="container py-6 space-y-6">
      <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-accent/15 p-5 md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl w-full">
            <Skeleton className="h-7 w-40 rounded-full" />
            <Skeleton className="h-8 w-full max-w-2xl" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>
          <div className="rounded-xl border bg-background/70 p-3 text-sm w-[180px] space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-7 w-12" />
          </div>
        </div>
      </section>

      <Card className="py-4 gap-4">
        <CardHeader className="px-4 md:px-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent className="grid gap-3 px-4 md:px-6 md:grid-cols-2 xl:grid-cols-3">
          {templateSkeletonIds.map((skeletonId) => (
            <div key={skeletonId} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
            <Skeleton className="h-10 w-full md:col-span-2" />
            <Skeleton className="h-10 w-full md:col-span-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <div className="space-y-2">
              {marketSkeletonIds.map((skeletonId) => (
                <Skeleton key={skeletonId} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1 xl:grid-cols-3">
        {editorSkeletonIds.map((skeletonId) => (
          <Card key={skeletonId}>
            <CardHeader>
              <Skeleton className="h-5 w-44" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-[320px] w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-52" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-md" />
        </CardContent>
      </Card>
    </div>
  );
}
