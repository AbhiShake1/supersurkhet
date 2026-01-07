import * as React from "react";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { AutoForm, AutoFormWithoutLabel } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { appSchema } from "@/lib/schema";
import { parseSchema } from "@autoform/zod";
import {
  type NestedSchema,
  type NestedSchemaType,
  type SchemaKeys,
  type UpdaterParams,
  getNestedZodShape,
  getSchema,
  useCreate,
} from "@gta/react-hooks";
import { z } from "zod";
import {
  ArrowBigUpDash,
  FileJson,
  FileText,
  Plus,
  Save,
  Sheet,
} from "lucide-react";
import {
  Credenza,
  CredenzaBody,
  CredenzaContent,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "../ui/credenza";
import { BadgeMarquee } from "../ui/badge-marquee";
import { api } from "@/lib/api";
import { parseCSVFile, parseExcelFile, parseJSONFile, validateDataAgainstSchema } from "@/lib/import";
import type { GunMessagePut } from "gun";
import type { DataTableRowAction } from "@/types/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface AddRowDialogProps<T extends SchemaKeys> {
  schema: T;
  slug: string;
  fieldOverrides?: Partial<Record<keyof NestedSchema<T>["shape"], z.ZodTypeAny>>;
  extender?: <E extends (shape: z.ZodObject<any>) => NestedSchemaType<T>>(shape: Parameters<E>[0]) => ReturnType<E>;
  formSchemaTransformer?: (schema: NestedSchema<T>) => z.ZodTypeAny;
  onCreate?: (data: GunMessagePut, variables: UpdaterParams<T>, context: unknown) => unknown;
  readOnly?: boolean;
  className?: string;
  children?: React.ReactNode;
  buttonLabel?: string;
  buttonIcon?: React.ReactNode;
}

export function AddRowDialog<T extends SchemaKeys>({
  schema,
  slug,
  fieldOverrides,
  extender,
  formSchemaTransformer,
  onCreate,
  readOnly = false,
  className,
  children,
  buttonLabel = "Add New",
  buttonIcon = <Plus className="size-4" />,
}: AddRowDialogProps<T>) {
  const [formValues, setFormValues] = React.useState<Record<string, any>>({});
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { user } = useAuth();
  const [file, setFile] = React.useState<File | null>(null);
  const [isImportPending, setIsImportPending] = React.useState(false);

  const createMutation = useCreate({
    keys: [schema, slug],
    onSuccess(...args) {
      setDialogOpen(false);
      onCreate?.(...args);
    }
  });

  const _schema = getNestedZodShape(schema, appSchema.schemaShape);
  const schemaWithOverrides = getSchema(_schema);
  const finalSchema = extender?.(schemaWithOverrides) ?? schemaWithOverrides.extend(fieldOverrides ?? {});
  const formSchema = formSchemaTransformer?.(finalSchema) ?? finalSchema;

  const handleFileUpload = async (e: any, format: 'csv' | 'excel' | 'json') => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsImportPending(true);

    try {
      let parsedData: any[] = [];

      if (format === 'csv') {
        parsedData = await parseCSVFile(selectedFile);
      } else if (format === 'excel') {
        parsedData = await parseExcelFile(selectedFile);
      } else if (format === 'json') {
        parsedData = await parseJSONFile(selectedFile);
      }

      // Validate the parsed data against the schema
      const { validData, errors } = validateDataAgainstSchema(parsedData, finalSchema as z.ZodObject<any>);

      if (errors.length > 0) {
        // Show validation errors to user
        console.error("Validation errors:", errors);
        alert(`Validation errors found in ${errors.length} records. Please check console for details.`);
        return;
      }

      // Create all records
      for (const record of validData) {
        createMutation.mutate({
          ...record,
          // created_by: user?._?.soul ?? "anon",
          timestamp: Date.now(),
        });
      }

      // Reset file input
      if (e.target) {
        e.target.value = '';
      }
    } catch (error) {
      console.error(`Error parsing ${format} file:`, error);
      alert(`Error parsing ${format} file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImportPending(false);
    }
  };

  const handleFileImport = (acceptedFormats: string, fileType: 'csv' | 'excel' | 'json') => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = acceptedFormats
    input.onchange = e => {
      handleFileUpload(e, fileType)
    }
    input.click()
  };

  if (readOnly) {
    return <>{children}</>;
  }

  return (
    <ButtonGroup className={className}>
      <Credenza open={dialogOpen} onOpenChange={setDialogOpen}>
        <CredenzaTrigger asChild>
          <Button className="gap-2 rounded-r-none border-r">
            {buttonIcon}
            <span className="hidden sm:inline">
              {buttonLabel}
            </span>
          </Button>
        </CredenzaTrigger>
        <CredenzaContent>
          <CredenzaHeader className="min-w-0">
            <CredenzaTitle className="capitalize">Add new {schema}</CredenzaTitle>
            <CredenzaDescription asChild>
              <AddDataSuggestions schemaName={schema} slug={slug} onSelected={setFormValues} />
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody asChild>
            <ScrollArea className="h-[50vh] max-h-[60vh]">
              <AutoForm
                values={formValues}
                schema={formSchema}
                onSubmit={(b) => createMutation.mutate({ ...b, created_by: user?._?.soul ?? "anon", timestamp: Date.now() })}
                formProps={{ id: "auto-table-add-form" }}
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
      <AddRowImportMenu
        onImport={handleFileImport}
        isImportPending={isImportPending}
      />
    </ButtonGroup>
  );
}

interface AddRowImportMenuProps {
  onImport: (acceptedFormats: string, fileType: 'csv' | 'excel' | 'json') => void;
  isImportPending: boolean;
}

function AddRowImportMenu({ onImport, isImportPending }: AddRowImportMenuProps) {
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
        <DropdownMenuItem onClick={() => onImport(".csv", "csv")} className="gap-2">
          <FileText className="h-4 w-4" />
          Import from CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImport(".json", "json")} className="gap-2">
          <FileJson className="h-4 w-4" />
          Import from JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onImport(".xlsx,.xls", "excel")} className="gap-2">
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
  onSelected: (item: any) => void;
}

export function AddDataSuggestions({ schemaName, slug, onSelected }: AddDataSuggestionsProps) {
  const { data, isLoading } = useAllData(schemaName);

  if (isLoading) return "loading suggestions..."

  function getTeansformedData() {
    if (!data?.length) return []
    const othersData = data.filter(d => d?.business !== slug)

    const uniqueData = Object.values(Object.fromEntries(othersData.map(d => [d?.title || d?.name || d?.label || d?.text || d?.displayName || d?.heading || "", d])))
    return uniqueData
  }

  const transformedData = getTeansformedData()

  if (!transformedData?.length) return null

  return <BadgeMarquee items={transformedData} onSelected={onSelected} />
}

function useAllData(tableName: SchemaKeys) {
  const { data: allItems, ...rest } = api[tableName].useGet();

  const data = allItems?.flatMap(d => {
    const business = d._?.soul;
    return Object.values(d).map(d =>
      !d || typeof d !== "object" ? null : ({ ...d, business })
    );
  }).filter(d => !!d && typeof d === "object" && !("soul" in d))

  return { data, ...rest };
}