import _UIBuilder from "@/components/ui/ui-builder";
import { primitiveComponentDefinitions } from "@/lib/ui-builder/registry/primitive-component-definitions";
import { complexComponentDefinitions } from "@/lib/ui-builder/registry/complex-component-definitions";
import { api } from "@/lib/api";
import { lazy, memo, useMemo } from "react";
import type { LayerChangeHandler, VariableChangeHandler } from "./ui/ui-builder/types";
import _ from "lodash";
import { Spinner } from "./ui/spinner";
import { NotFound } from "./ui/not-found";
import { ContextDataStore } from "@/lib/ui-builder/context/context-data-store";
import type { Business } from "@/lib/schema";
import { useProfile } from "@/hooks/use-profile";

const LayerRenderer = lazy(() => import('@/components/ui/ui-builder/layer-renderer'))

const UIBuilder = memo(_UIBuilder, (prevProps, nextProps) => {
  return _.isEqual(prevProps.componentRegistry, nextProps.componentRegistry)
    && prevProps.isLoading === nextProps.isLoading
    && prevProps.createNew === nextProps.createNew
  //   && _.isEqual(prevProps.initialLayers, nextProps.initialLayers)
  // && _.isEqual(prevProps.initialVariables, nextProps.initialVariables)
})

const componentRegistry = {
  ...primitiveComponentDefinitions, // div, span, img, etc.
  ...complexComponentDefinitions,   // Button, Badge, Card, etc.
};

// recursively omit #
function omitMeta<T>(obj: T): T {
  if (!obj) return obj;
  return _.transform(obj, (result, value, key) => {
    if (key === '#') return; // skip this key
    if (_.isArray(value)) {
      result[key] = value.map(omitMeta);
    } else if (_.isPlainObject(value)) {
      result[key] = omitMeta(value);
    } else {
      result[key] = value;
    }
  });
}
export function flattenObject(
  obj: Record<string, any>,
  prefix = ""
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

interface UseContextDataProps {
  business?: Business;
}

function useContextData({ business }: UseContextDataProps) {
  const user = useProfile()
  const context = useMemo(() => {
    return {
      context: flattenObject({
        business,
        user: _.pick(user, ["name", "email", "avatar", "isActive", "role"]),
        // user: omitMeta(user),
        date: {
          currentTime: new Date().toISOString(),
          locale: "en-US",
          timezone: "Asia/Kathmandu"
        }
      })
    }
  }, [business, user])

  return context
}

export function CustomUiBuilderPage({ slug }: { slug: string }) {
  const { mutate: upsert } = api.business.useUpdate()
  const { data: _data, isLoading } = api.business.useGet({
    keys: [slug],
    single: true,
  })
  const data = omitMeta(_data?.[0])

  const currentLayers = data?.uiBuilder?.layers
  const currentVariables = data?.uiBuilder?.variables

  const handleVariablesChange: VariableChangeHandler = (variables) => {
    if (isLoading) return
    upsert({ id: slug, uiBuilder: { variables: JSON.stringify(variables) } })
  }

  const handleLayersChange: LayerChangeHandler = (newLayers) => {
    if (isLoading) return
    upsert({ id: slug, uiBuilder: { layers: JSON.stringify(newLayers) } })
  }

  const createNew = useMemo(() => {
    return !isLoading && !currentLayers?.length
  }, [isLoading, data])

  // Create dynamic context data based on actual business data if available
  const contextData = useContextData({ business: data });

  return (
    <ContextDataStore contextData={contextData}>
      <UIBuilder
        componentRegistry={componentRegistry}
        isLoading={isLoading}
        persistLayerStore={false}
        onChange={handleLayersChange}
        onVariablesChange={handleVariablesChange}
        initialVariables={currentVariables ? JSON.parse(currentVariables) : undefined}
        initialLayers={currentLayers ? JSON.parse(currentLayers) : undefined}
        createNew={createNew}
      />
    </ContextDataStore>
  )
}

export function CustomUiRendererPage({ slug }: { slug: string }) {
  const { data: _business, isLoading } = api.business.useGet({ keys: [slug], single: true })

  if (isLoading) return <Spinner />

  const business = _business?.[0]

  if (!business?.uiBuilder?.layers || !business.uiBuilder?.variables) return <NotFound />

  // Create context data for rendering - using business data if available
  const contextData = useContextData({ business });

  return <LayerRenderer
    componentRegistry={componentRegistry}
    variables={JSON.parse(business.uiBuilder?.variables)}
    page={JSON.parse(business.uiBuilder?.layers)?.[0]}
    contextData={contextData}
  // layers={JSON.parse(business.uiBuilder?.layers)?.[0]}
  />
}
