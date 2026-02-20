import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import type { ParsedField } from '@autoform/core';
import type { ZodObjectOrWrapped } from '@autoform/zod';
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Star,
  XCircle,
} from 'lucide-react';
import { useState, type FC, type ReactNode } from 'react';
import { z } from 'zod';
import { AutoTable } from '../auto-table';
import type { fieldConfig } from '../ui/autoform';
import { Drawer, DrawerContent, DrawerTrigger } from '../ui/drawer';
import { CredenzaBody } from '../ui/credenza';
import { useDrawer } from '@/contexts/dialog-context';
import { MapPreview } from '../ui/autoform/components/MapPreview';
import { getGunRef, GUN_PREFIX, GUN_SEPARATOR } from '@/lib/gun/utils';
import { Skeleton } from '../ui/skeleton';
import { useQuery } from '@tanstack/react-query';
type FieldType = NonNullable<Parameters<typeof fieldConfig>[0]['fieldType']>;

export type AutoPreviewComponent<T, S extends ParsedField = ParsedField> = FC<{
  value: T;
  schema: S;
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
  const enabled = !!value && typeof value === "string" && !!value?.startsWith(GUN_PREFIX);
  const { isLoading, data } = useQuery({
    enabled,
    queryKey: ['auto-preview', value],
    queryFn: async () => {
      const v = value as string;
      const values = v.split(GUN_SEPARATOR);
      const basePart = values.slice(0, -1).join(GUN_SEPARATOR);
      const gunRef = getGunRef(basePart).get(v);
      return await gunRef.then() ?? "-";
    },
  })
  const Comp =
    // @ts-expect-error
    autoPreviewComponents[field.type] ?? autoPreviewComponents.fallback;

  if (enabled) {
    function getDisplayValue() {
      const displayKey = field.fieldConfig?.customData?.displayKey ?? '_.#';
      const displayKeys = displayKey.split('.');
      return displayKeys.reduce((acc, key) => acc?.[key], data);
    }
    return <Comp value={isLoading ? "loading..." : getDisplayValue()} schema={schema} />;
  }

  return <Comp value={value} schema={schema} />;
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
const SelectPreview: AutoPreviewComponent<string> = ({ value }) => value;
const StringPreview: AutoPreviewComponent<string> = ({ value }) => <>{value}</>;
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
  const arraySchema: z.ZodArray<any> =
    schema instanceof z.ZodEffects ? schema.innerType() : schema;
  const parsedSchema = arraySchema._def.type || arraySchema._def.innerType;
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

  // Check if the value is in the format "unit:piecesPerUnit" (special units)
  if (typeof value === 'string' && value.includes(':')) {
    const [unit, piecesPerUnit] = value.split(':');
    return (
      <span>
        {unit} ({piecesPerUnit} pieces per {unit})
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
  className: StringPreview,
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
