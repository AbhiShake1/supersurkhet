import type { ComponentType as ReactComponentType } from 'react';
import type { FieldConfigItem } from '@/components/ui/auto-form/types';
import type {
  ComponentLayer,
  ComponentRegistry,
  RegistryEntry,
} from '@/components/ui/ui-builder/types';
import { findLayerRecursive } from '@/lib/ui-builder/store/layer-utils';

// Cache for field overrides to avoid regenerating them
const fieldOverrideCache = new Map<string, Record<string, FieldConfigItem>>();

// Helper to create a cache key for a layer
const createCacheKey = (layer: ComponentLayer): string => {
  // Include layer type, id, and a hash of props to detect changes
  const propsHash = JSON.stringify(layer.props);
  return `${layer.type}-${layer.id}-${propsHash}`;
};

export const generateFieldOverrides = (
  registry: ComponentRegistry,
  layer: ComponentLayer,
): Record<string, FieldConfigItem> => {
  const componentDefinition = registry[layer.type];
  if (!componentDefinition) {
    return {};
  }

  if (!componentDefinition.fieldOverrides) {
    return {};
  }

  // Create cache key for this layer
  const cacheKey = createCacheKey(layer);

  // Check if we have cached overrides for this exact layer state
  if (fieldOverrideCache.has(cacheKey)) {
    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
    return fieldOverrideCache.get(cacheKey)!;
  }

  // Generate field overrides
  const fieldOverrides: Record<string, FieldConfigItem> = {};
  Object.keys(componentDefinition.fieldOverrides).forEach((key) => {
    const override = componentDefinition.fieldOverrides?.[key];
    if (override) {
      fieldOverrides[key] = override(layer);
    }
  });

  // Cache the result
  fieldOverrideCache.set(cacheKey, fieldOverrides);

  // Clean up old cache entries to prevent memory leaks (keep last 100 entries)
  if (fieldOverrideCache.size > 100) {
    const firstKey = fieldOverrideCache.keys().next().value;
    if (firstKey) {
      fieldOverrideCache.delete(firstKey);
    }
  }

  return fieldOverrides;
};

//Checking of component type, checked via from property, if undefined or null then its a primitive like <div/>, <img/>, etc
export function isPrimitiveComponent(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  component: RegistryEntry<ReactComponentType<any>>,
): boolean {
  return component.from === undefined || component.from === null;
}

//Checking of component type, checked via from property, if defined and not null then its a complex component like <Button/>, <Badge/>, etc
export function isCustomComponent(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  component: RegistryEntry<ReactComponentType<any>>,
): boolean {
  return component.from !== undefined && component.from !== null;
}

export const findLayerInTree = (
  page: ComponentLayer | null | undefined,
  layerId: string,
): ComponentLayer | undefined => {
  if (!page) {
    return undefined;
  }
  if (page.id === layerId) {
    return page;
  }
  if (!Array.isArray(page.children)) {
    return undefined;
  }
  return findLayerRecursive(page.children, layerId);
};

export const resolveFocusStackForPage = (
  page: ComponentLayer | null | undefined,
  focusStack: string[],
): string[] => {
  if (!page || focusStack.length === 0) {
    return [];
  }

  const resolvedStack: string[] = [];
  let currentRoot: ComponentLayer = page;

  for (const focusedLayerId of focusStack) {
    const nextRoot =
      focusedLayerId === currentRoot.id
        ? currentRoot
        : findLayerInTree(currentRoot, focusedLayerId);

    if (!nextRoot) {
      break;
    }

    resolvedStack.push(nextRoot.id);
    currentRoot = nextRoot;
  }

  return resolvedStack;
};

export const getEffectiveCanvasRootId = (
  page: ComponentLayer | null | undefined,
  focusStack: string[],
): string | null => {
  if (!page) {
    return null;
  }

  const resolvedStack = resolveFocusStackForPage(page, focusStack);
  return resolvedStack.at(-1) ?? page.id;
};

export const isLayerInFocusedSubtree = (
  page: ComponentLayer | null | undefined,
  focusStack: string[],
  layerId: string | null | undefined,
): boolean => {
  if (!page || !layerId) {
    return false;
  }

  const effectiveRootId = getEffectiveCanvasRootId(page, focusStack);
  if (!effectiveRootId) {
    return false;
  }

  if (layerId === effectiveRootId) {
    return true;
  }

  const effectiveRootLayer = findLayerInTree(page, effectiveRootId);
  return Boolean(findLayerInTree(effectiveRootLayer, layerId));
};
