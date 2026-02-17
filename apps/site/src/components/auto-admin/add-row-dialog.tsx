import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoForm } from '@/components/ui/autoform';
import { SubmitButton } from '@/components/ui/autoform/components/SubmitButton';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { appSchema } from '@/lib/schema';
import { getSoulFromUnknown } from '@/lib/utils';
import {
  type SchemaKeys,
  type NestedSchema,
  type NestedSchemaType,
  getNestedZodShape,
  getSchema,
  useCreate,
} from '@gta/react-hooks';
import { ZodEffects } from 'zod';
import {
  ArrowBigUpDash,
  FileJson,
  FileText,
  Plus,
  Save,
  Sheet,
} from 'lucide-react';
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from '../ui/credenza';
import { BadgeMarquee } from '../ui/badge-marquee';
import { api } from '@/lib/api';
import {
  parseCSVFile,
  parseExcelFile,
  parseJSONFile,
  validateDataAgainstSchema,
} from '@/lib/import';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { AutoTableProps } from '../auto-table';
import type { ZodObjectOrWrapped } from '../ui/auto-form/utils';

export type AddRowDialogProps<T extends SchemaKeys> = Pick<
  AutoTableProps<T>,
  'slug' | 'extender' | 'onCreate' | 'readOnly' | 'className'
> & {
  schema: T;
  children?: React.ReactNode;
  buttonLabel?: string | React.ReactNode;
  buttonIcon?: string | React.ReactNode;
};

export function AddRowDialog<T extends SchemaKeys>({
  schema,
  slug,
  extender,
  onCreate,
  readOnly = false,
  className,
  children,
  buttonLabel = 'Add New',
  buttonIcon = <Plus className="size-4" />,
}: AddRowDialogProps<T>) {
  'use memo';
  const [formValues, setFormValues] = React.useState<Record<string, unknown>>(
    {},
  );
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { user } = useAuth();
  const [isImportPending, setIsImportPending] = React.useState(false);

  const createMutation = useCreate({
    keys: [schema, slug ?? ''],
    onSuccess(...args) {
      setDialogOpen(false);
      onCreate?.(...args);
    },
  });

  const _schema = getNestedZodShape(schema, appSchema.schemaShape);
  const schemaWithOverrides = getSchema(_schema);
  const tableSchema = schemaWithOverrides as NestedSchema<T>;
  function getFinalSchema() {
    let schema: ZodObjectOrWrapped = schemaWithOverrides;
    if (extender) {
      schema = extender(tableSchema);
    }
    return schema;
  }
  const finalSchema = getFinalSchema();
  const finalSchemaObject =
    finalSchema instanceof ZodEffects ? finalSchema.innerType() : finalSchema;
  type SchemaRecord = Omit<NestedSchemaType<T>, '_'> & {
    id?: string | number;
  };

  const handleFileUpload = async (
    selectedFile: File | null,
    format: 'csv' | 'excel' | 'json',
  ) => {
    if (!selectedFile) return;
    setIsImportPending(true);

    try {
      let parsedData: unknown[] = [];

      if (format === 'csv') {
        parsedData = await parseCSVFile(selectedFile);
      } else if (format === 'excel') {
        parsedData = await parseExcelFile(selectedFile);
      } else if (format === 'json') {
        parsedData = await parseJSONFile(selectedFile);
      }

      // Validate the parsed data against the schema
      const { validData, errors } = validateDataAgainstSchema(
        parsedData,
        finalSchemaObject,
      );

      if (errors.length > 0) {
        // Show validation errors to user
        console.error('Validation errors:', errors);
        alert(
          `Validation errors found in ${errors.length} records. Please check console for details.`,
        );
        return;
      }

      // Create all records
      for (const record of validData) {
        const payload = finalSchemaObject.parse({
          ...record,
          timestamp: Date.now(),
        }) as SchemaRecord;
        createMutation.mutate(payload);
      }

      // Reset file input
      // file input value reset handled in handleFileImport
    } catch (error) {
      console.error(`Error parsing ${format} file:`, error);
      alert(
        `Error parsing ${format} file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsImportPending(false);
    }
  };

  const handleFileImport = (
    acceptedFormats: string,
    fileType: 'csv' | 'excel' | 'json',
  ) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptedFormats;
    input.onchange = () => {
      handleFileUpload(input.files?.[0] ?? null, fileType).finally(() => {
        input.value = '';
      });
    };
    input.click();
  };

  if (readOnly) {
    return <>{children}</>;
  }

  return (
    <ButtonGroup className={className}>
      {slug && (
        <Credenza open={dialogOpen} onOpenChange={setDialogOpen}>
          <CredenzaTrigger asChild>
            <Button className="gap-2 rounded-r-none border-r">
              {buttonIcon}
              <span className="hidden sm:inline">{buttonLabel}</span>
            </Button>
          </CredenzaTrigger>
          <CredenzaContent>
            <CredenzaHeader className="min-w-0">
              <CredenzaTitle className="capitalize">
                Add new {schema}
              </CredenzaTitle>
              <CredenzaDescription asChild>
                <AddDataSuggestions
                  schemaName={schema}
                  slug={slug}
                  onSelected={setFormValues}
                />
              </CredenzaDescription>
            </CredenzaHeader>
            <CredenzaBody asChild>
              <ScrollArea className="h-[50vh] max-h-[60vh]">
                <AutoForm
                  values={formValues}
                  schema={finalSchema}
                  onSubmit={(b) => {
                    const payload = finalSchemaObject.parse({
                      ...b,
                      created_by: user?._?.soul ?? 'anon',
                      timestamp: Date.now(),
                    }) as SchemaRecord;
                    createMutation.mutate(payload);
                  }}
                  formProps={{ id: 'auto-table-add-form' }}
                />
              </ScrollArea>
            </CredenzaBody>
            <CredenzaFooter className="flex flex-col gap-2 pt-2 pb-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <SubmitButton
                form="auto-table-add-form"
                className="gap-2 w-full"
                loading={createMutation.isPending}
              >
                <Save className="size-4" />
                Save
              </SubmitButton>
            </CredenzaFooter>
          </CredenzaContent>
        </Credenza>
      )}
      <AddRowImportMenu
        onImport={handleFileImport}
        isImportPending={isImportPending}
      />
    </ButtonGroup>
  );
}

interface AddRowImportMenuProps {
  onImport: (
    acceptedFormats: string,
    fileType: 'csv' | 'excel' | 'json',
  ) => void;
  isImportPending: boolean;
}

function AddRowImportMenu({
  onImport,
  isImportPending,
}: AddRowImportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          aria-label="Import Options"
          className="rounded-l-none border-l-0"
          disabled={isImportPending}
        >
          <ArrowBigUpDash className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuItem
          onClick={() => onImport('.csv', 'csv')}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          Import from CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onImport('.json', 'json')}
          className="gap-2"
        >
          <FileJson className="h-4 w-4" />
          Import from JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onImport('.xlsx,.xls', 'excel')}
          className="gap-2"
        >
          <Sheet className="h-4 w-4" />
          Import from Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface AddDataSuggestionsProps {
  slug: string;
  schemaName: SchemaKeys;
  onSelected: (item: SuggestionItem) => void;
}

type SuggestionItem = Record<string, unknown> & {
  business: string | undefined;
};

export function AddDataSuggestions({
  schemaName,
  slug,
  onSelected,
}: AddDataSuggestionsProps) {
  const { data, isLoading } = useAllData(schemaName);

  if (isLoading) return 'loading suggestions...';

  function getTeansformedData() {
    if (!data?.length) return [];
    const othersData = data.filter((d) => d?.business !== slug);

    const getLabel = (item: SuggestionItem) => {
      const labelKeys = [
        'title',
        'name',
        'label',
        'text',
        'displayName',
        'heading',
      ];
      for (const key of labelKeys) {
        const value = item[key];
        if (typeof value === 'string' && value.length > 0) return value;
      }
      return '';
    };

    const uniqueData = Object.values(
      Object.fromEntries(
        othersData.map((item, index) => [
          getLabel(item) || `item-${index}`,
          item,
        ]),
      ),
    );
    return uniqueData;
  }

  const transformedData = getTeansformedData();

  if (!transformedData?.length) return null;

  return <BadgeMarquee items={transformedData} onSelected={onSelected} />;
}

function useAllData(tableName: SchemaKeys) {
  const { data: allItems, ...rest } = api[tableName].useGet();

  const isSuggestionItem = (
    value: SuggestionItem | null,
  ): value is SuggestionItem =>
    !!value && typeof value === 'object' && !('soul' in value);

  const data = allItems
    ?.flatMap((item) => {
      const business = getSoulFromUnknown(item);
      return Object.values(item).map((entry) => {
        if (!entry || typeof entry !== 'object') return null;
        return { ...(entry as Record<string, unknown>), business };
      });
    })
    .filter(isSuggestionItem);

  return { data, ...rest };
}
