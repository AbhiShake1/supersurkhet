import type { NestedSchemaType, SchemaKeys } from '@gta/react-hooks';
import { useMutation } from '@tanstack/react-query';
import {
  ArrowBigUpDash,
  FileJson,
  FileText,
  Plus,
  Save,
  Sheet,
} from 'lucide-react';
import * as React from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoForm } from '@/components/ui/autoform';
import { SubmitButton } from '@/components/ui/autoform/components/SubmitButton';
import type { ZodObjectOrWrapped } from '@/components/ui/autoform/zod';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { resolveRuntimeSchema } from '@/lib/auto-runtime/schema-runtime';
import { create } from '@/lib/gun/ssr/create';
import {
  parseCSVFile,
  parseExcelFile,
  parseJSONFile,
  validateDataAgainstSchema,
} from '@/lib/import';
import { appSchema } from '@/lib/schema';
import { getSoulFromUnknown } from '@/lib/utils';
import type { AutoTableProps } from '../auto-table';
import { BadgeMarquee } from '../ui/badge-marquee';
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
import { ShortcutKbd, useShortcutAction } from '../ui/keyboard-shortcuts';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

const ADD_ROW_DIALOG_SHORTCUTS = {
  openRowForm: {
    id: 'autoTable.openRowForm',
    label: 'Open add row form',
    description: 'Open the Add New row dialog.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'n',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  openImportMenu: {
    id: 'autoTable.openImportMenu',
    label: 'Open import menu',
    description: 'Open import options for adding rows.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'i',
      ctrl: false,
      meta: true,
      alt: false,
      shift: true,
    },
  },
  cancelAddRow: {
    id: 'autoTable.cancelAddRow',
    label: 'Cancel add row',
    description: 'Close the Add New row dialog.',
    scope: 'AutoTable',
    defaultBinding: {
      key: 'Escape',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
} as const;

export type AddRowDialogProps<T extends SchemaKeys> = Pick<
  AutoTableProps<T>,
  'slug' | 'extender' | 'onCreate' | 'readOnly' | 'className'
> & {
  schema?: T;
  runtimeSchema?: ZodObjectOrWrapped;
  onCreateRow?: (payload: Record<string, unknown>) => Promise<unknown>;
  children?: React.ReactNode;
  buttonLabel?: string | React.ReactNode;
  buttonIcon?: string | React.ReactNode;
};

export function AddRowDialog<T extends SchemaKeys>({
  schema,
  runtimeSchema,
  onCreateRow,
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
  const shortcutScopeRef = React.useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const [isImportPending, setIsImportPending] = React.useState(false);
  const suggestionsSchema = schema;

  const createMutation = useMutation({
    mutationFn: async (payload: SchemaRecord) => {
      if (onCreateRow) {
        return onCreateRow(payload as Record<string, unknown>);
      }
      if (!schema || !slug) {
        throw new Error(
          'Add row requires either runtime create handler or schema+slug',
        );
      }
      return create(schema, slug)(payload);
    },
    onSuccess(...args) {
      setDialogOpen(false);
      onCreate?.(...(args as Parameters<NonNullable<typeof onCreate>>));
    },
  });

  const { schema: finalSchema, schemaObject: finalSchemaObject } =
    resolveRuntimeSchema({
      schemaKey: runtimeSchema ? undefined : schema,
      schemaShape: appSchema.schemaShape,
      runtimeSchema,
      extender: extender as
        | ((schema: ZodObjectOrWrapped) => ZodObjectOrWrapped)
        | undefined,
    });
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

  const isShortcutInScope = React.useCallback((event: KeyboardEvent) => {
    const target = event.target as Node | null;
    const active = document.activeElement as Node | null;
    const dialogContent = document.querySelector(
      '[data-auto-table-add-dialog-content="true"]',
    );

    if (
      shortcutScopeRef.current &&
      ((target && shortcutScopeRef.current.contains(target)) ||
        (active && shortcutScopeRef.current.contains(active)))
    ) {
      return true;
    }

    if (!dialogContent) return false;
    if (target && dialogContent.contains(target)) return true;
    if (active && dialogContent.contains(active)) return true;
    return false;
  }, []);

  useShortcutAction(
    ADD_ROW_DIALOG_SHORTCUTS.openRowForm,
    () => {
      if (!slug || readOnly) return;
      setDialogOpen(true);
    },
    {
      enabled: Boolean(slug && !readOnly && !dialogOpen),
      guard: isShortcutInScope,
    },
  );
  useShortcutAction(
    ADD_ROW_DIALOG_SHORTCUTS.cancelAddRow,
    () => {
      setDialogOpen(false);
    },
    {
      enabled: dialogOpen,
      guard: isShortcutInScope,
    },
  );
  useShortcutAction(
    ADD_ROW_DIALOG_SHORTCUTS.openImportMenu,
    () => {
      const trigger =
        shortcutScopeRef.current?.querySelector<HTMLButtonElement>(
          '[data-auto-table-import-trigger="true"]',
        );
      trigger?.click();
    },
    {
      enabled: !readOnly && !isImportPending,
      guard: isShortcutInScope,
    },
  );

  if (readOnly) {
    return <>{children}</>;
  }

  return (
    <div ref={shortcutScopeRef}>
      <ButtonGroup className={className}>
        {slug && (
          <Credenza open={dialogOpen} onOpenChange={setDialogOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <CredenzaTrigger asChild>
                  <Button
                    className="gap-2 rounded-r-none border-r"
                    data-auto-table-add-row-trigger="true"
                  >
                    {buttonIcon}
                    <span className="hidden sm:inline">{buttonLabel}</span>
                  </Button>
                </CredenzaTrigger>
              </TooltipTrigger>
              <TooltipContent className="flex items-center gap-2">
                <span>{buttonLabel}</span>
                <ShortcutKbd
                  actionId={ADD_ROW_DIALOG_SHORTCUTS.openRowForm.id}
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            <CredenzaContent data-auto-table-add-dialog-content="true">
              <CredenzaHeader className="min-w-0">
                <CredenzaTitle className="capitalize">
                  Add new {schema ?? 'row'}
                </CredenzaTitle>
                {suggestionsSchema ? (
                  <CredenzaDescription asChild>
                    <AddDataSuggestions
                      schemaName={suggestionsSchema}
                      slug={slug}
                      onSelected={setFormValues}
                    />
                  </CredenzaDescription>
                ) : null}
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="flex items-center gap-2">
                    <span>Cancel</span>
                    <ShortcutKbd
                      actionId={ADD_ROW_DIALOG_SHORTCUTS.cancelAddRow.id}
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
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
    </div>
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              aria-label="Import Options"
              className="rounded-l-none border-l-0 lg:h-9 lg:w-auto lg:gap-2 lg:px-2"
              data-auto-table-import-trigger="true"
              disabled={isImportPending}
            >
              <ArrowBigUpDash className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="flex items-center gap-2">
            <span>Import options</span>
            <ShortcutKbd
              actionId={ADD_ROW_DIALOG_SHORTCUTS.openImportMenu.id}
              interactive={false}
            />
          </TooltipContent>
        </Tooltip>
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
