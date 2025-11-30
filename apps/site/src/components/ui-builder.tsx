import _UIBuilder from "@/components/ui/ui-builder";
import { primitiveComponentDefinitions } from "@/lib/ui-builder/registry/primitive-component-definitions";
import { complexComponentDefinitions } from "@/lib/ui-builder/registry/complex-component-definitions";
import { api } from "@/lib/api";
import { memo, useMemo } from "react";
import type { LayerChangeHandler, VariableChangeHandler } from "./ui/ui-builder/types";
import _ from "lodash";

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

export function CustomUiBuilderPage({ slug }: { slug: string }) {
  const { mutate: create } = api.uiBuilder.useCreate({ keys: [slug] })
  const { mutate: upsert } = api.uiBuilder.useUpdate({ keys: [slug] })
  const { data: _data, isLoading } = api.uiBuilder.useGet({
    keys: [slug]
  })
  const data = omitMeta(_data?.[0])

  const id = data?._?.soul
  const currentLayers = data?.layers
  const currentVariables = data?.variables

  const handleVariablesChange: VariableChangeHandler = (variables) => {
    if (isLoading) return
    if (id)
      upsert({ id, variables: JSON.stringify(variables), timestamp: Date.now() })
    else
      create({ variables: JSON.stringify(variables), layers: "[]", timestamp: Date.now() })
  }

  const handleLayersChange: LayerChangeHandler = (_layers) => {
    type Layer = typeof _layers[number];
    const assignDummyProps = (layer: Layer): Layer => {
      // Copy props or assign dummy if empty
      const newProps =
        !layer.props || Object.keys(layer.props).length === 0
          ? { className: "" }
          : { ...layer.props };

      // Recursively copy children if array
      const newChildren =
        Array.isArray(layer.children)
          ? layer.children.map((child) =>
            typeof child === "object" ? assignDummyProps(child) : child
          )
          : layer.children;

      return {
        ...layer,
        props: newProps,
        children: newChildren,
      };
    };

    // Map over the top-level layers to get a new copy
    const newLayers = _layers.map(assignDummyProps);
    if (id) {
      upsert({ id, layers: JSON.stringify(newLayers), timestamp: Date.now() })
    } else if (!data)
      create({ layers: JSON.stringify(newLayers), variables: "[]", timestamp: Date.now() })
  }

  const createNew = useMemo(() => {
    return !isLoading && !currentLayers?.length
  }, [isLoading, data])

  return (
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
  )
}
