import type { ParsedField } from '@autoform/core';
import { useQueries } from '@tanstack/react-query';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Star,
  XCircle,
} from 'lucide-react';
import type { FC, ReactNode } from 'react';
import { z } from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { useBusinessSafe } from '@/contexts/business-context';
import { useDrawer } from '@/contexts/dialog-context';
import { getSchemaReferenceSources } from '@/lib/zod/with-references';
import { AutoTable } from '../auto-table';
import type { ZodObjectOrWrapped } from '../ui/auto-form/utils';
import type { fieldConfig } from '../ui/autoform';
import { MapPreview } from '../ui/autoform/components/MapPreview';
import type { FieldConfigCustomData, SourceConfig } from '../ui/autoform/utils';
import { CredenzaBody } from '../ui/credenza';
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer';

type FieldType = NonNullable<Parameters<typeof fieldConfig>[0]['fieldType']>;

export type AutoPreviewComponent<T, S extends ParsedField = ParsedField> = FC<{
  value: T;
  schema: S;
  field: ParsedField;
}>;

export function AutoPreview<T>({
  field,
  value,
  baseSchema: schema,
}: {
  field: ParsedField;
  value: T;
  baseSchema: ZodObjectOrWrapped;
}): ReactNode {
  const Comp =
    // @ts-expect-error
    autoPreviewComponents[field.type] ?? autoPreviewComponents.fallback;

  return <Comp value={value} schema={schema} field={field} />;
}

const DatePreview: AutoPreviewComponent<Date> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  // If value is a string, try to parse it
  const date =
    typeof value === 'string'
      ? new Date(value)
      : typeof value === 'number'
        ? new Date(value)
        : value;

  if (Number.isNaN(date.getTime())) {
    return <span className="text-muted-foreground">Invalid Date</span>;
  }

  return (
    <span className="font-mono text-sm">
      {date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}
    </span>
  );
};

const ImagePreview: AutoPreviewComponent<string> = ({ value }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" className="h-auto p-0">
          <img
            src={value}
            alt="preview"
            className="max-h-[100px] w-auto object-contain"
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-[90vw]">
        <img
          src={value}
          alt="preview"
          className="h-full w-full object-contain"
        />
      </DialogContent>
    </Dialog>
  );
};
const NumberPreview: AutoPreviewComponent<number> = ({ value }) => <>{value}</>;
const StringPreview: AutoPreviewComponent<string> = ({ value }) => <>{value}</>;

function asString(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function getComparableId(value: unknown) {
  const raw = asString(value);
  if (!raw) return '';
  const segments = raw.split('/').filter(Boolean);
  return segments.at(-1) ?? raw;
}

function getPathnameBasePath() {
  if (typeof window === 'undefined') return '';
  return window.location.pathname.split('/').filter(Boolean).at(0) ?? '';
}

function getPreviewSources(
  customData: FieldConfigCustomData | undefined,
): SourceConfig[] {
  if (customData?.source) return [customData.source];
  if (customData?.sources?.length) return customData.sources;
  return getSchemaReferenceSources(customData?.reference).map(
    (source) => source as SourceConfig,
  );
}

function getStaticValueLabel(
  sources: SourceConfig[],
  value: string,
): string | null {
  const comparableValue = getComparableId(value);
  for (const source of sources) {
    if (!source.valueLabels) continue;
    const exact = source.valueLabels[value];
    if (exact) return exact;
    const comparable =
      comparableValue && comparableValue !== value
        ? source.valueLabels[comparableValue]
        : undefined;
    if (comparable) return comparable;
  }
  return null;
}

function getOptionsLabel(
  options: Array<[string, string]> | undefined,
  value: string,
): string | null {
  if (!options?.length || !value) return null;
  const match = options.find(
    ([optionValue]) => asString(optionValue) === value,
  );
  if (!match) return null;
  return asString(match[1]);
}

function getRowLabel(
  source: SourceConfig,
  row: Record<string, unknown>,
  fallback: string,
) {
  const staticLabel = source.valueLabels?.[fallback];
  if (staticLabel) return staticLabel;

  if ('displayKeys' in source && Array.isArray(source.displayKeys)) {
    const joined = source.displayKeys
      .map((key) => {
        const value = row[key as string];
        return value === null || value === undefined ? '' : String(value);
      })
      .filter(Boolean)
      .join(source.separator ?? ' - ');
    const finalValue = `${joined}${source.suffix ?? ''}`.trim();
    return finalValue || fallback;
  }

  if ('displayKey' in source && source.displayKey) {
    const value = row[source.displayKey as string];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }

  for (const key of ['title', 'name', 'label', 'code', 'id']) {
    const value = row[key];
    if (value !== null && value !== undefined && value !== '') {
      return String(value);
    }
  }

  return fallback;
}

const SelectPreview: AutoPreviewComponent<string | number> = ({
  value,
  field,
}) => {
  const valueAsString = asString(value);
  const customData = field.fieldConfig?.customData as
    | FieldConfigCustomData
    | undefined;
  const sources = getPreviewSources(customData);
  const options =
    customData?.options ??
    (field.options as Array<[string, string]> | undefined) ??
    [];
  const business = useBusinessSafe();
  const basePath = business?.business?.basePath ?? getPathnameBasePath();
  const targetId = getComparableId(valueAsString);
  const sourceQueries = useQueries({
    queries: sources.map((source) => ({
      queryKey: ['auto-preview', 'relation', basePath, source.table],
      enabled: Boolean(valueAsString && source.table && basePath),
      async queryFn() {
        if (!source.table || !basePath) return [];
        const { db } = await import('@/lib/ssr/api');
        const tableApi = (
          db as Record<
            string,
            { get: (params: { keys: string[] }) => Promise<unknown[]> }
          >
        )[source.table];
        if (!tableApi?.get) return [];
        return tableApi.get({ keys: [basePath] });
      },
    })),
  });

  if (!valueAsString) return <span className="text-muted-foreground">-</span>;

  for (const [index, source] of sources.entries()) {
    const sourceRows = sourceQueries[index]?.data ?? [];
    const sourceValueKey =
      typeof source.valueKey === 'string' ? source.valueKey : undefined;
    const matchedRow = sourceRows.find((item) => {
      if (!item || typeof item !== 'object') return false;
      const row = item as Record<string, unknown>;
      const rowValue = sourceValueKey
        ? asString(row[sourceValueKey])
        : asString((item as { _?: { soul?: string } })._?.soul);
      return getComparableId(rowValue) === targetId;
    });

    if (matchedRow && typeof matchedRow === 'object') {
      return getRowLabel(
        source,
        matchedRow as Record<string, unknown>,
        valueAsString,
      );
    }
  }

  const staticLabel = getStaticValueLabel(sources, valueAsString);
  if (staticLabel) return staticLabel;

  const labelFromOptions = getOptionsLabel(options, valueAsString);
  return labelFromOptions ?? valueAsString;
};
const RecordPreview: AutoPreviewComponent<object> = ({ value, schema }) => {
  if (!value) return null;
  if (!('#' in value)) return null;
  if (typeof value['#'] !== 'string') return null;
  const isEffect = schema instanceof z.ZodEffects;
  if (!isEffect) return null;
  const fullKey = value['#'];
  const parsedSchema = schema.innerType()._def.valueType;
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button type="button">Click to expand</button>
      </DrawerTrigger>
      <DrawerContent className="overflow-scroll">
        <CredenzaBody>
          <AutoTable slug={fullKey} parsedSchema={parsedSchema} />
        </CredenzaBody>
      </DrawerContent>
    </Drawer>
  );
};

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
const ArrayPreview: AutoPreviewComponent<any[]> = ({ value, schema }) => {
  if (!value) return null;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const fullKey = (value as any)?.['#'] as string;
  if (!fullKey) return null;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  let arraySchema: z.ZodArray<any> =
    schema instanceof z.ZodEffects ? schema.innerType() : schema;

  // Handle ZodOptional, ZodNullable wrappers
  if ('innerType' in arraySchema._def) {
    arraySchema = arraySchema._def.innerType;
  }

  // For ZodArray, the element type is in _def.type (ZodType)
  // We need to unwrap it through all layers (ZodEffects, ZodOptional, etc.)
  let elementType = arraySchema._def.type;

  // Unwrap ZodEffects
  if (elementType instanceof z.ZodEffects) {
    elementType = elementType.innerType();
  }
  // Unwrap ZodOptional/ZodNullable
  if ('innerType' in elementType._def) {
    elementType = elementType._def.innerType;
  }

  const parsedSchema = elementType;
  // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
  const { openDialog } = useDrawer();

  return (
    <Button
      variant="ghost"
      className="h-auto w-full"
      onClick={() =>
        openDialog({
          children: (
            <AutoTable
              parsedSchema={parsedSchema}
              readOnly
              treatSlugAsAbsolute
              data={value}
            />
          ),
        })
      }
    >
      Click to expand
    </Button>
  );
};

const PhonePreview: AutoPreviewComponent<string> = ({ value }) => {
  return (
    <>{value ? value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3') : '-'}</>
  );
};

const UrlPreview: AutoPreviewComponent<string> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  try {
    const url = new URL(value);
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline flex items-center gap-1"
      >
        {url.hostname}
        <ExternalLink className="h-3 w-3" />
      </a>
    );
  } catch {
    return <span className="text-muted-foreground">{value}</span>;
  }
};

const ColorPreview: AutoPreviewComponent<string> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex items-center gap-2">
      <div
        className="h-4 w-4 rounded border border-muted-foreground/30"
        style={{ backgroundColor: value }}
      />
      <span className="font-mono text-sm">{value.toUpperCase()}</span>
    </div>
  );
};

const FilePreview: AutoPreviewComponent<string> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  // Extract filename from path
  const fileName = value.split('/').pop() || value;

  return (
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm truncate max-w-[150px]">{fileName}</span>
    </div>
  );
};

const RatingPreview: AutoPreviewComponent<number> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
            key={i}
            className={`h-4 w-4 ${i < Math.floor(value)
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
              }`}
          />
        ))}
      </div>
      <span className="text-sm font-medium">{value.toFixed(1)}</span>
    </div>
  );
};

const TagsPreview: AutoPreviewComponent<string[]> = ({ value }) => {
  if (!value || !Array.isArray(value) || value.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {value.slice(0, 3).map((tag, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
        <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0.5">
          {tag}
        </Badge>
      ))}
      {value.length > 3 && (
        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
          +{value.length - 3}
        </Badge>
      )}
    </div>
  );
};

const UnitPreview: AutoPreviewComponent<string> = ({ value }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  // Check if the value is in the format "unit:itemsPerPack" (packed units)
  if (typeof value === 'string' && value.includes(':')) {
    const [unit, itemsPerPack] = value.split(':');
    return (
      <span>
        {unit} ({itemsPerPack} items per {unit})
      </span>
    );
  }

  // For regular units, just return the unit name
  return <span>{String(value)}</span>;
};

const CurrencyPreview: AutoPreviewComponent<number> = ({ value }) => {
  if (value === undefined || value === null) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <span className="font-medium">
      {new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(value)}
    </span>
  );
};

const BooleanPreview: AutoPreviewComponent<boolean> = ({ value }) => {
  return value ? (
    <CheckCircle2 className="text-green-500 size-4 w-full" />
  ) : (
    <XCircle className="text-destructive w-full size-4" />
  );
};

const autoPreviewComponents: Record<
  FieldType | 'fallback',
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  AutoPreviewComponent<any>
> = {
  boolean: BooleanPreview,
  date: DatePreview,
  datetime: DatePreview,
  image: ImagePreview,
  number: NumberPreview,
  select: SelectPreview,
  string: StringPreview,
  record: RecordPreview,
  password: () => '********',
  richText: StringPreview,
  editor: StringPreview,
  color: ColorPreview,
  file: FilePreview,
  rating: RatingPreview,
  slider: NumberPreview,
  tags: TagsPreview,
  currency: CurrencyPreview,
  phone: PhonePreview,
  url: UrlPreview,
  timestamp: DatePreview,
  unit: UnitPreview,
  map: MapPreview,
  permissions: ({ value }) =>
    `${value?.length ?? Object.keys(value).length} Permissions`,
  fallback: (props) => {
    if (typeof props.value === 'object' && Array.isArray(props.value)) {
      return <ArrayPreview value={props.value} schema={props.schema} />;
    }
    return '-';
  },
};
