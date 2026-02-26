import type React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import AutoForm from '@/components/ui/auto-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import {
  applyAutoAdminRootFocusedConfigPatch,
  readAutoAdminRootFocusedConfig,
} from '@/config/business-config';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import { addDefaultValues } from '@/lib/ui-builder/store/schema-utils';

type FocusAwareEditorStoreState = {
  focusStack?: string[];
  getEffectiveCanvasRootId?: (
    page: ComponentLayer | null | undefined,
  ) => string | null;
};

type JsonSectionKey = 'tabs' | 'bindings' | 'systemTabs' | 'dataScopes';
type JsonSectionState = Record<JsonSectionKey, string>;
type JsonSectionErrorState = Partial<Record<JsonSectionKey, string>>;
type FocusedAutoAdminRootConfig = ReturnType<
  typeof readAutoAdminRootFocusedConfig
>;

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

export const ConfigPanel = () => {
  const {
    selectedPageId,
    findLayerById,
    removeLayer,
    duplicateLayer,
    updateLayer,
    pages,
  } = useLayerStore();

  const selectedLayer = findLayerById(selectedPageId) as
    | ComponentLayer
    | undefined;
  const focusStack = useEditorStore(
    (state) => (state as FocusAwareEditorStoreState).focusStack ?? [],
  );
  const effectiveCanvasRootId = useEditorStore((state) =>
    (state as FocusAwareEditorStoreState).getEffectiveCanvasRootId?.(
      selectedLayer,
    ),
  );
  const focusedLayerId = focusStack.at(-1);
  const isFocusedAutoAdminRoot =
    selectedLayer?.type === 'AutoAdminRoot' &&
    (effectiveCanvasRootId === selectedLayer.id ||
      focusedLayerId === selectedLayer.id);

  const handleDeleteLayer = useCallback(
    (layerId: string) => {
      removeLayer(layerId);
    },
    [removeLayer],
  );

  const handleDuplicateLayer = useCallback(() => {
    if (selectedLayer) {
      duplicateLayer(selectedLayer.id);
    }
  }, [selectedLayer, duplicateLayer]);

  const handleUpdateLayerProps = useCallback(
    (
      id: string,
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      props: Record<string, any>,
      rest?: Omit<ComponentLayer, 'props' | 'children'>,
    ) => {
      updateLayer(id, props, rest);
    },
    [updateLayer],
  );

  if (!selectedLayer) {
    return null;
  }

  return (
    <>
      <PageLayerForm
        selectedLayer={selectedLayer}
        removeLayer={handleDeleteLayer}
        duplicateLayer={handleDuplicateLayer}
        updateLayerProps={handleUpdateLayerProps}
        allowDelete={pages.length > 1}
      />
      {isFocusedAutoAdminRoot ? (
        <FocusedAutoAdminRootConfigForm
          selectedLayer={selectedLayer}
          updateLayerProps={handleUpdateLayerProps}
        />
      ) : null}
    </>
  );
};

interface PageLayerFormProps {
  selectedLayer: ComponentLayer;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayerProps: (
    id: string,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    props: Record<string, any>,
    rest?: Omit<ComponentLayer, 'props' | 'children'>,
  ) => void;
  allowDelete: boolean;
}

const PageLayerForm: React.FC<PageLayerFormProps> = ({
  selectedLayer,
  removeLayer,
  duplicateLayer,
  updateLayerProps,
  allowDelete,
}) => {
  const schema = useMemo(
    () =>
      z.object({
        name: z.string().min(1, 'Name is required'),
      }),
    [],
  );

  const handleSetValues = useCallback(
    (data: Partial<z.infer<typeof schema>>) => {
      const { name } = data;

      // Merge the changed fields into the existing layer
      const mergedValues = { ...selectedLayer, name, props: {} };
      const { props, ...rest } = mergedValues;

      updateLayerProps(selectedLayer.id, props, rest);
    },
    [selectedLayer, updateLayerProps],
  );

  const formSchema = useMemo(
    () =>
      addDefaultValues(schema, {
        name: selectedLayer.name,
      }),
    [selectedLayer, schema],
  );

  const values = useMemo(
    () => ({
      name: selectedLayer.name,
    }),
    [selectedLayer],
  );

  const fieldConfig = useMemo(
    () => ({
      name: {
        inputProps: {
          value: selectedLayer.name,
          // defaultValue: selectedLayer.name,
        },
      },
    }),
    [selectedLayer],
  );

  const handleDuplicateLayer = useCallback(() => {
    duplicateLayer(selectedLayer.id);
  }, [selectedLayer, duplicateLayer]);

  const handleRemoveLayer = useCallback(() => {
    removeLayer(selectedLayer.id);
  }, [selectedLayer, removeLayer]);

  return (
    <AutoForm
      formSchema={formSchema}
      onValuesChange={handleSetValues}
      values={values}
      fieldConfig={fieldConfig}
    >
      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full"
        onClick={handleDuplicateLayer}
      >
        Duplicate Page
      </Button>
      {allowDelete && (
        <Button
          type="button"
          variant="destructive"
          className="mt-4 w-full"
          onClick={handleRemoveLayer}
        >
          Delete Page
        </Button>
      )}
    </AutoForm>
  );
};

function FocusedAutoAdminRootConfigForm({
  selectedLayer,
  updateLayerProps,
}: {
  selectedLayer: ComponentLayer;
  updateLayerProps: (
    id: string,
    props: Record<string, unknown>,
    rest?: Omit<ComponentLayer, 'props' | 'children'>,
  ) => void;
}) {
  const focusedConfig = useMemo(
    () => readAutoAdminRootFocusedConfig(selectedLayer.props),
    [selectedLayer.props],
  );

  const focusedConfigKey = useMemo(
    () =>
      JSON.stringify({
        tabs: focusedConfig.tabs,
        bindings: focusedConfig.bindings,
        systemTabs: focusedConfig.systemTabs,
        dataScopes: focusedConfig.dataScopes,
      }),
    [
      focusedConfig.tabs,
      focusedConfig.bindings,
      focusedConfig.systemTabs,
      focusedConfig.dataScopes,
    ],
  );

  return (
    <FocusedAutoAdminRootConfigDraftForm
      key={focusedConfigKey}
      selectedLayer={selectedLayer}
      focusedConfig={focusedConfig}
      updateLayerProps={updateLayerProps}
    />
  );
}

function FocusedAutoAdminRootConfigDraftForm({
  selectedLayer,
  focusedConfig,
  updateLayerProps,
}: {
  selectedLayer: ComponentLayer;
  focusedConfig: FocusedAutoAdminRootConfig;
  updateLayerProps: (
    id: string,
    props: Record<string, unknown>,
    rest?: Omit<ComponentLayer, 'props' | 'children'>,
  ) => void;
}) {
  const [drafts, setDrafts] = useState<JsonSectionState>({
    tabs: formatJson(focusedConfig.tabs),
    bindings: formatJson(focusedConfig.bindings),
    systemTabs: formatJson(focusedConfig.systemTabs),
    dataScopes: formatJson(focusedConfig.dataScopes),
  });
  const [errors, setErrors] = useState<JsonSectionErrorState>({});

  const setDraft = useCallback((key: JsonSectionKey, value: string) => {
    setDrafts((current) => ({ ...current, [key]: value }));
  }, []);

  const applyDraft = useCallback(
    (key: JsonSectionKey) => {
      try {
        const parsedByKey = {
          tabs: parseJson<unknown[]>(drafts.tabs),
          bindings: parseJson<Record<string, unknown>>(drafts.bindings),
          systemTabs: parseJson<Record<string, unknown>>(drafts.systemTabs),
          dataScopes: parseJson<Record<string, unknown>>(drafts.dataScopes),
        } as const;
        const parsedValue = parsedByKey[key];
        const expectedArray = key === 'tabs';
        if (expectedArray && !Array.isArray(parsedValue)) {
          setErrors((current) => ({
            ...current,
            [key]: 'Tabs must be a JSON array.',
          }));
          return;
        }
        if (
          !expectedArray &&
          (typeof parsedValue !== 'object' ||
            parsedValue === null ||
            Array.isArray(parsedValue))
        ) {
          setErrors((current) => ({
            ...current,
            [key]: 'Value must be a JSON object.',
          }));
          return;
        }

        const nextProps = applyAutoAdminRootFocusedConfigPatch(
          selectedLayer.props,
          {
            [key]: parsedValue,
          },
        );
        updateLayerProps(selectedLayer.id, nextProps);
        setErrors((current) => {
          const { [key]: _removed, ...rest } = current;
          return rest;
        });
      } catch {
        setErrors((current) => ({
          ...current,
          [key]: 'Invalid JSON.',
        }));
      }
    },
    [drafts, selectedLayer, updateLayerProps],
  );

  return (
    <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
      <h3 className="text-sm font-medium">Focused AutoAdminRoot Config</h3>
      <JsonSection
        title="Tabs"
        description="Configure admin tabs rendered by AutoAdminRoot."
        value={drafts.tabs}
        error={errors.tabs}
        onChange={(value) => setDraft('tabs', value)}
        onApply={() => applyDraft('tabs')}
      />
      <JsonSection
        title="Bindings"
        description="Configure tab/data binding map. Hybrid bindings are preserved."
        value={drafts.bindings}
        error={errors.bindings}
        onChange={(value) => setDraft('bindings', value)}
        onApply={() => applyDraft('bindings')}
      />
      <JsonSection
        title="System Tabs"
        description="Configure system tab title, group, and icon details."
        value={drafts.systemTabs}
        error={errors.systemTabs}
        onChange={(value) => setDraft('systemTabs', value)}
        onApply={() => applyDraft('systemTabs')}
      />
      <JsonSection
        title="Data Scopes"
        description="Configure scoped data sources for focused AutoAdminRoot editing."
        value={drafts.dataScopes}
        error={errors.dataScopes}
        onChange={(value) => setDraft('dataScopes', value)}
        onApply={() => applyDraft('dataScopes')}
      />
    </div>
  );
}

function JsonSection({
  title,
  description,
  value,
  error,
  onChange,
  onApply,
}: {
  title: string;
  description: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  onApply: () => void;
}) {
  return (
    <section className="space-y-2 rounded-md border border-border/60 p-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-36 font-mono text-xs"
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" size="sm" onClick={onApply}>
          Apply
        </Button>
      </div>
    </section>
  );
}

export default PageLayerForm;
