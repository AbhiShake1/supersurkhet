import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { getDefaultProps } from '@/lib/ui-builder/store/schema-utils';

/**
 * Recursively visits each layer in the layer tree and applies the provided visitor function to each layer.
 * The visitor function can modify the layer and its children as needed.
 *
 * @param layer - The current layer to visit.
 * @param visitor - A function that takes a layer and returns a modified layer.
 * @returns The modified layer after applying the visitor function.
 */
export const visitLayer = (
  layer: ComponentLayer,
  parentLayer: ComponentLayer | null,
  visitor: (
    layer: ComponentLayer,
    parentLayer: ComponentLayer | null,
  ) => ComponentLayer,
): ComponentLayer => {
  // Apply the visitor to the current layer
  const updatedLayer = visitor(layer, parentLayer);

  // Recursively traverse and update children if they exist
  let finalLayer = updatedLayer;
  if (hasLayerChildren(updatedLayer)) {
    const updatedChildren = updatedLayer.children.map((child) =>
      visitLayer(child, updatedLayer, visitor),
    );
    finalLayer = { ...updatedLayer, children: updatedChildren };
  }

  // Also traverse into ReactNode props that contain component layers
  if (hasLayerReactNodeProps(updatedLayer)) {
    finalLayer = visitLayerReactNodeProps(finalLayer, visitor);
  }

  return finalLayer;
};

/**
 * Recursively visits component layers within ReactNode props of the current layer.
 *
 * @param layer - The current layer to visit ReactNode props for.
 * @param visitor - A function that takes a layer and returns a modified layer.
 * @returns The modified layer after applying the visitor function to ReactNode props.
 */
export const visitLayerReactNodeProps = (
  layer: ComponentLayer,
  visitor: (
    layer: ComponentLayer,
    parentLayer: ComponentLayer | null,
  ) => ComponentLayer,
): ComponentLayer => {
  const updatedProps = { ...layer.props };
  let hasChanges = false;

  for (const [key, value] of Object.entries(layer.props || {})) {
    if (isComponentLayer(value)) {
      // Single component layer in a prop
      const updatedValue = visitLayer(value, layer, visitor);
      if (updatedValue !== value) {
        updatedProps[key] = updatedValue;
        hasChanges = true;
      }
    } else if (Array.isArray(value)) {
      // Array of component layers in a prop
      const updatedArray = value.map((item) =>
        isComponentLayer(item) ? visitLayer(item, layer, visitor) : item,
      );
      if (JSON.stringify(updatedArray) !== JSON.stringify(value)) {
        updatedProps[key] = updatedArray;
        hasChanges = true;
      }
    } else if (typeof value === 'object' && value !== null) {
      // Check for objects that might contain component layers
      if (isComponentLayer(value)) {
        const updatedValue = visitLayer(value, layer, visitor);
        if (updatedValue !== value) {
          updatedProps[key] = updatedValue;
          hasChanges = true;
        }
      }
      // Check for objects that might have children-like structures
      if (
        Array.isArray((value as any).children) &&
        typeof (value as any).children !== 'string'
      ) {
        const updatedNestedChildren = (value as any).children.map(
          (item: ComponentLayer) =>
            isComponentLayer(item) ? visitLayer(item, layer, visitor) : item,
        );
        if (
          JSON.stringify(updatedNestedChildren) !==
          JSON.stringify((value as any).children)
        ) {
          (updatedProps as any)[key] = {
            ...value,
            children: updatedNestedChildren,
          };
          hasChanges = true;
        }
      }
    }
  }

  return hasChanges ? { ...layer, props: updatedProps } : layer;
};

export const countLayers = (layers: ComponentLayer[] | string): number => {
  if (typeof layers === 'string') {
    return 0;
  }
  return layers.reduce((count, layer) => {
    let childCount = 0;
    if (hasLayerChildren(layer)) {
      childCount += countLayers(layer.children);
    }
    // Also count layers in ReactNode props
    if (hasLayerReactNodeProps(layer)) {
      childCount += countLayersInReactNodeProps(layer);
    }
    return count + 1 + childCount;
  }, 0);
};

/**
 * Counts layers contained in ReactNode props of a layer
 *
 * @param layer - The layer to count in ReactNode props
 * @returns Number of layers in ReactNode props
 */
export const countLayersInReactNodeProps = (layer: ComponentLayer): number => {
  let count = 0;
  const props = layer.props || {};

  for (const [key, value] of Object.entries(props)) {
    if (isComponentLayer(value)) {
      // Single component layer - count it and any children it might have
      count += 1 + (hasLayerChildren(value) ? countLayers(value.children) : 0);
      // Also count any nested layers in its props
      if (hasLayerReactNodeProps(value)) {
        count += countLayersInReactNodeProps(value);
      }
    } else if (Array.isArray(value)) {
      // Array of component layers
      for (const item of value) {
        if (isComponentLayer(item)) {
          count +=
            1 + (hasLayerChildren(item) ? countLayers(item.children) : 0);
          if (hasLayerReactNodeProps(item)) {
            count += countLayersInReactNodeProps(item);
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Check for objects that might contain component layers
      if (isComponentLayer(value)) {
        count +=
          1 + (hasLayerChildren(value) ? countLayers(value.children) : 0);
        if (hasLayerReactNodeProps(value)) {
          count += countLayersInReactNodeProps(value);
        }
      }
      // Check for objects that might have children-like structures
      if (
        Array.isArray((value as any).children) &&
        typeof (value as any).children !== 'string'
      ) {
        count += countLayers((value as any).children);
      }
    }
  }

  return count;
};

export const addLayer = (
  layers: ComponentLayer[],
  newLayer: ComponentLayer,
  parentId?: string,
  parentPosition?: number,
): ComponentLayer[] => {
  const updatedPages = layers.map((page) =>
    visitLayer(page, null, (layer) => {
      if (layer.id === parentId) {
        // Handle both layers with existing children and those with undefined/null children
        let updatedChildren: ComponentLayer[] = [];

        if (hasLayerChildren(layer)) {
          updatedChildren = [...layer.children];
        } else if (
          layer.children === undefined ||
          layer.children === null ||
          (Array.isArray(layer.children) && layer.children.length === 0)
        ) {
          // Initialize children array for layers with undefined/null children or empty arrays
          updatedChildren = [];
        } else {
          // For layers with string children or other non-array types, we can't add children
          return layer;
        }

        if (parentPosition !== undefined) {
          if (parentPosition < 0) {
            // If parentPosition is negative, insert at the beginning
            updatedChildren = [newLayer, ...updatedChildren];
          } else if (parentPosition >= updatedChildren.length) {
            // If parentPosition is greater than or equal to the length, append to the end
            updatedChildren = [...updatedChildren, newLayer];
          } else {
            // Insert at the specified position
            updatedChildren = [
              ...updatedChildren.slice(0, parentPosition),
              newLayer,
              ...updatedChildren.slice(parentPosition),
            ];
          }
        } else {
          // If parentPosition is undefined, append to the end
          updatedChildren = [...updatedChildren, newLayer];
        }

        return { ...layer, children: updatedChildren };
      }

      return layer;
    }),
  );
  return updatedPages;
};

export const findAllParentLayersRecursive = (
  layers: ComponentLayer[],
  layerId: string,
): ComponentLayer[] => {
  const parents: ComponentLayer[] = [];

  const findParents = (layers: ComponentLayer[], targetId: string): boolean => {
    for (const layer of layers) {
      if (hasLayerChildren(layer)) {
        if (layer.children.some((child) => child.id === targetId)) {
          parents.push(layer);
          // Continue searching upwards
          findParents(layers, layer.id);
          return true;
        }

        if (findParents(layer.children, targetId)) {
          parents.push(layer);
          return true;
        }
      }

      // Also check ReactNode props for the target ID
      if (hasLayerReactNodeProps(layer)) {
        if (hasLayerInReactNodeProps(layer, targetId)) {
          parents.push(layer);
          findParents(layers, layer.id);
          return true;
        }

        // Check if any layer in props has the target as its descendant
        const layerInProps = findLayerInReactNodeProps(layer, targetId);
        if (layerInProps) {
          parents.push(layer);
          return true;
        }
      }
    }
    return false;
  };

  findParents(layers, layerId);
  return parents;
};

/**
 * Checks if a layer with the given ID exists in the ReactNode props of the given layer
 *
 * @param layer - The layer to search in ReactNode props
 * @param layerId - The ID to search for
 * @returns true if the layer exists in ReactNode props
 */
export const hasLayerInReactNodeProps = (
  layer: ComponentLayer,
  layerId: string,
): boolean => {
  const props = layer.props || {};

  for (const [key, value] of Object.entries(props)) {
    if (isComponentLayer(value)) {
      if (value.id === layerId) {
        return true;
      }
      // Recursively check if the target layer is within this component layer
      if (findLayerRecursive([value], layerId)) {
        return true;
      }
    } else if (Array.isArray(value)) {
      // Array of component layers
      for (const item of value) {
        if (isComponentLayer(item)) {
          if (item.id === layerId) {
            return true;
          }
          if (findLayerRecursive([item], layerId)) {
            return true;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Check for objects that might contain component layers
      if (isComponentLayer(value)) {
        if (value.id === layerId) {
          return true;
        }
        if (findLayerRecursive([value], layerId)) {
          return true;
        }
      }
      // Check for objects that might have children-like structures
      if (
        Array.isArray((value as any).children) &&
        typeof (value as any).children !== 'string'
      ) {
        if (findLayerRecursive((value as any).children, layerId)) {
          return true;
        }
      }
    }
  }

  return false;
};

export const findLayerRecursive = (
  layers: ComponentLayer[],
  layerId: string,
): ComponentLayer | undefined => {
  for (const layer of layers) {
    if (layer.id === layerId) {
      return layer;
    }
    if (hasLayerChildren(layer)) {
      const foundInChildren = findLayerRecursive(layer.children, layerId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    // Also search in ReactNode props
    if (hasLayerReactNodeProps(layer)) {
      const foundInProps = findLayerInReactNodeProps(layer, layerId);
      if (foundInProps) {
        return foundInProps;
      }
    }
  }
  return undefined;
};

export const duplicateWithNewIdsAndName = (
  layer: ComponentLayer,
  addCopySuffix = true,
): ComponentLayer => {
  const newLayer: ComponentLayer = { ...layer, id: createId() };
  if (layer.name) {
    newLayer.name = `${layer.name}${addCopySuffix ? ' (Copy)' : ''}`;
  }
  if (hasLayerChildren(newLayer) && hasLayerChildren(layer)) {
    newLayer.children = layer.children.map((child) =>
      duplicateWithNewIdsAndName(child, false),
    );
  }
  // Also duplicate layers in ReactNode props
  if (hasLayerReactNodeProps(layer)) {
    const duplicatedProps = { ...layer.props };
    for (const [key, value] of Object.entries(layer.props || {})) {
      if (isComponentLayer(value)) {
        // Single component layer in a prop
        duplicatedProps[key] = duplicateWithNewIdsAndName(value, false);
      } else if (Array.isArray(value)) {
        // Array of component layers in a prop
        duplicatedProps[key] = value
          .filter(isComponentLayer)
          .map((child) => duplicateWithNewIdsAndName(child, false));
      } else if (
        typeof value === 'object' &&
        value !== null &&
        isComponentLayer(value)
      ) {
        // Object that is itself a component layer
        duplicatedProps[key] = duplicateWithNewIdsAndName(value, false);
      }
    }
    newLayer.props = duplicatedProps;
  }
  return newLayer;
};

export function createId(): string {
  const ALPHABET =
    '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const ID_LENGTH = 7;
  let result = '';
  const alphabetLength = ALPHABET.length;

  for (let i = 0; i < ID_LENGTH; i++) {
    const randomIndex = Math.floor(Math.random() * alphabetLength);
    result += ALPHABET.charAt(randomIndex);
  }

  return result;
}

export const hasLayerChildren = (
  layer: ComponentLayer,
): layer is ComponentLayer & { children: ComponentLayer[] } => {
  return Array.isArray(layer.children) && typeof layer.children !== 'string';
};

/**
 * Checks if a layer has any ReactNode props that contain component layers
 * @param layer The layer to check
 * @returns true if any prop contains component layers
 */
export const hasLayerReactNodeProps = (layer: ComponentLayer): boolean => {
  const props = layer.props || {};
  for (const [key, value] of Object.entries(props)) {
    // Check if this prop contains a component layer
    if (isComponentLayer(value)) {
      return true;
    }
    // Check if this prop contains an array of component layers
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every(isComponentLayer)
    ) {
      return true;
    }
  }
  // Also check for nested objects that might contain component layers
  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'object' && value !== null) {
      // Look for nested objects that might have a component layer structure
      if (isComponentLayer(value)) {
        return true;
      }
      // Look for objects with a children-like structure
      if (
        Array.isArray((value as any).children) &&
        typeof (value as any).children !== 'string' &&
        (value as any).children.length > 0
      ) {
        return true;
      }
    }
  }
  return false;
};

/**
 * Checks if a value is a component layer object
 * @param value The value to check
 * @returns true if the value is a component layer
 */
export const isComponentLayer = (value: any): value is ComponentLayer => {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.type === 'string' &&
    (Array.isArray(value.children) ||
      typeof value.children === 'string' ||
      value.children === undefined)
  );
};

/**
 * Creates a new component layer with default props and children initialized from the component registry.
 * This utility function consolidates the layer initialization logic used across the application.
 *
 * @param layerType - The type of component to create
 * @param componentRegistry - The component registry containing component definitions
 * @param options - Optional configuration for the layer
 * @returns A new ComponentLayer with initialized props and children
 */
export const createComponentLayer = (
  layerType: string,
  componentRegistry: ComponentRegistry,
  options: {
    id?: string;
    name?: string;
  } = {},
): ComponentLayer => {
  const { id, name } = options;

  const componentDef =
    componentRegistry[layerType as keyof typeof componentRegistry];
  if (!componentDef) {
    throw new Error(`Component definition not found for type: ${layerType}`);
  }

  const schema = componentDef.schema;

  // Safely check if schema has shape property (ZodObject)
  const defaultProps =
    'shape' in schema && schema.shape ? getDefaultProps(schema as any) : {};
  const defaultChildrenRaw = componentDef.defaultChildren;
  const defaultChildren =
    typeof defaultChildrenRaw === 'string'
      ? defaultChildrenRaw
      : defaultChildrenRaw?.map((child) =>
          duplicateWithNewIdsAndName(child, false),
        ) || [];

  const initialProps = Object.entries(defaultProps).reduce(
    (acc, [key, propDef]) => {
      if (key !== 'children') {
        acc[key] = propDef;
      }
      return acc;
    },
    {} as Record<string, any>,
  );

  const newLayer: ComponentLayer = {
    id: id || createId(),
    type: layerType,
    name: name || layerType,
    props: initialProps,
    children: defaultChildren,
  };

  return newLayer;
};

/**
 * Moves a layer from one position to another in the layer tree.
 * This function supports moving layers between different parents and reordering within the same parent.
 *
 * @param layers - The array of root layers (pages)
 * @param sourceLayerId - The ID of the layer to move
 * @param targetParentId - The ID of the target parent layer
 * @param targetPosition - The position in the target parent's children array (0-based index)
 * @returns The updated layers array with the layer moved to its new position
 */
export const moveLayer = (
  layers: ComponentLayer[],
  sourceLayerId: string,
  targetParentId: string,
  targetPosition: number,
): ComponentLayer[] => {
  let layerToMove: ComponentLayer | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let sourceParentId: string | null = null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let sourcePosition = -1;
  let sourceParentType: 'children' | 'prop' | 'propArray' = 'children';
  let sourcePropName: string | null = null;

  // Find the layer to move and its current parent
  const findLayerAndParent = (
    layers: ComponentLayer[],
    parentId: string | null = null,
  ): boolean => {
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (layer.id === sourceLayerId) {
        layerToMove = layer;
        sourceParentId = parentId;
        sourcePosition = i;
        sourceParentType = 'children';
        return true;
      }
      if (hasLayerChildren(layer)) {
        if (findLayerAndParent(layer.children, layer.id)) {
          return true;
        }
      }
      // Also check ReactNode props
      if (hasLayerReactNodeProps(layer)) {
        if (hasLayerInReactNodeProps(layer, sourceLayerId)) {
          // Find which prop contains the layer
          for (const [propName, value] of Object.entries(layer.props || {})) {
            if (isComponentLayer(value) && value.id === sourceLayerId) {
              layerToMove = value;
              sourceParentId = layer.id;
              sourcePropName = propName;
              sourceParentType = 'prop';
              return true;
            } else if (Array.isArray(value)) {
              const index = value.findIndex(
                (item) => isComponentLayer(item) && item.id === sourceLayerId,
              );
              if (index !== -1) {
                layerToMove = value[index];
                sourceParentId = layer.id;
                sourcePropName = propName;
                sourceParentType = 'propArray';
                sourcePosition = index;
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  };

  // Find the layer in the tree
  findLayerAndParent(layers);

  if (!layerToMove) {
    console.warn(`Source layer with ID ${sourceLayerId} not found`);
    return layers;
  }

  // Remove the layer from its current position
  let layersWithoutSource = layers;
  if (sourceParentType === 'children') {
    layersWithoutSource = layers.map((page) =>
      visitLayer(page, null, (layer) => {
        if (hasLayerChildren(layer)) {
          const updatedChildren = layer.children.filter(
            (child) => child.id !== sourceLayerId,
          );
          return { ...layer, children: updatedChildren };
        }
        return layer;
      }),
    );
  } else if (sourceParentType === 'prop') {
    layersWithoutSource = layers.map((page) =>
      visitLayer(page, null, (layer) => {
        if (layer.id === sourceParentId && sourcePropName) {
          const updatedProps = { ...layer.props };
          delete updatedProps[sourcePropName];
          return { ...layer, props: updatedProps };
        }
        return layer;
      }),
    );
  } else if (sourceParentType === 'propArray') {
    layersWithoutSource = layers.map((page) =>
      visitLayer(page, null, (layer) => {
        if (layer.id === sourceParentId && sourcePropName) {
          const updatedProps = { ...layer.props };
          const currentArray = updatedProps[sourcePropName];
          if (Array.isArray(currentArray)) {
            const updatedArray = currentArray.filter(
              (item) => !isComponentLayer(item) || item.id !== sourceLayerId,
            );
            updatedProps[sourcePropName] =
              updatedArray.length > 0 ? updatedArray : undefined;
          }
          return { ...layer, props: updatedProps };
        }
        return layer;
      }),
    );
  }

  // Add the layer to its new position
  // For now, just add to children, but we may want to extend this to support adding to props too
  const updatedLayers = addLayer(
    layersWithoutSource,
    layerToMove,
    targetParentId,
    targetPosition,
  );

  return updatedLayers;
};

/**
 * Checks if a layer can accept children (has a children property that is an array)
 *
 * @param layer - The layer to check
 * @param componentRegistry - The component registry to check schema
 * @returns true if the layer can accept children
 */
export const canLayerAcceptChildren = (
  layer: ComponentLayer,
  componentRegistry: ComponentRegistry,
): boolean => {
  const componentDef =
    componentRegistry[layer.type as keyof typeof componentRegistry];
  if (!componentDef) return false;

  // Safely check if schema has shape property (ZodObject) and children field
  const hasChildrenField =
    'shape' in componentDef.schema &&
    componentDef.schema.shape &&
    componentDef.schema.shape.children !== undefined;

  return hasChildrenField && hasLayerChildren(layer);
};

/**
 * Adds a layer to a specific ReactNode prop instead of the children array
 *
 * @param layers - The array of root layers (pages)
 * @param newLayer - The layer to add
 * @param parentId - The ID of the parent layer
 * @param propName - The name of the prop to add the layer to
 * @returns The updated layers array with the new layer added to the specified prop
 */
export const addLayerToProp = (
  layers: ComponentLayer[],
  newLayer: ComponentLayer,
  parentId: string,
  propName: string,
): ComponentLayer[] => {
  return layers.map((page) =>
    visitLayer(page, null, (layer) => {
      if (layer.id === parentId) {
        // Update the specific prop with the new layer
        const updatedProps = { ...layer.props };
        updatedProps[propName] = newLayer;
        return { ...layer, props: updatedProps };
      }
      return layer;
    }),
  );
};

/**
 * Adds a layer to a specific array ReactNode prop
 *
 * @param layers - The array of root layers (pages)
 * @param newLayer - The layer to add
 * @param parentId - The ID of the parent layer
 * @param propName - The name of the prop to add the layer to
 * @param position - The position in the array to add the layer (defaults to end)
 * @returns The updated layers array with the new layer added to the specified prop array
 */
export const addLayerToPropArray = (
  layers: ComponentLayer[],
  newLayer: ComponentLayer,
  parentId: string,
  propName: string,
  position?: number,
): ComponentLayer[] => {
  return layers.map((page) =>
    visitLayer(page, null, (layer) => {
      if (layer.id === parentId) {
        // Update the specific prop array with the new layer
        const updatedProps = { ...layer.props };
        let currentArray = updatedProps[propName];
        if (!Array.isArray(currentArray)) {
          currentArray = [];
        }

        if (position !== undefined) {
          if (position < 0) {
            currentArray = [newLayer, ...currentArray];
          } else if (position >= currentArray.length) {
            currentArray = [...currentArray, newLayer];
          } else {
            currentArray = [
              ...currentArray.slice(0, position),
              newLayer,
              ...currentArray.slice(position),
            ];
          }
        } else {
          currentArray = [...currentArray, newLayer];
        }

        updatedProps[propName] = currentArray;
        return { ...layer, props: updatedProps };
      }
      return layer;
    }),
  );
};

/**
 * Removes a layer from a specific ReactNode prop
 *
 * @param layers - The array of root layers (pages)
 * @param layerId - The ID of the layer to remove
 * @param parentId - The ID of the parent layer containing the prop
 * @param propName - The name of the prop to remove the layer from
 * @returns The updated layers array with the layer removed from the specified prop
 */
export const removeLayerFromProp = (
  layers: ComponentLayer[],
  layerId: string,
  parentId: string,
  propName: string,
): ComponentLayer[] => {
  return layers.map((page) =>
    visitLayer(page, null, (layer) => {
      if (layer.id === parentId) {
        // Remove the specific layer from the specified prop
        const updatedProps = { ...layer.props };
        const propValue = updatedProps[propName];

        if (isComponentLayer(propValue) && propValue.id === layerId) {
          // Direct match - set to undefined or remove the property
          updatedProps[propName] = undefined;
        } else if (Array.isArray(propValue)) {
          // Array of component layers - filter out the matching layer
          const filteredArray = propValue.filter(
            (layer) => layer.id !== layerId,
          );
          updatedProps[propName] =
            filteredArray.length > 0 ? filteredArray : undefined;
        }

        return { ...layer, props: updatedProps };
      }
      return layer;
    }),
  );
};

/**
 * Finds a layer within ReactNode props of a parent layer
 *
 * @param layer - The parent layer to search in
 * @param layerId - The ID of the layer to find
 * @returns The found layer or undefined
 */
export const findLayerInReactNodeProps = (
  layer: ComponentLayer,
  layerId: string,
): ComponentLayer | undefined => {
  const props = layer.props || {};

  for (const [key, value] of Object.entries(props)) {
    if (isComponentLayer(value)) {
      if (value.id === layerId) {
        return value;
      }
      // Recursively search in nested layers
      const foundInChildren = findLayerRecursive([value], layerId);
      if (foundInChildren) {
        return foundInChildren;
      }
    } else if (Array.isArray(value)) {
      // Array of component layers
      for (const item of value) {
        if (isComponentLayer(item)) {
          if (item.id === layerId) {
            return item;
          }
          // Recursively search in nested layers
          const foundInChildren = findLayerRecursive([item], layerId);
          if (foundInChildren) {
            return foundInChildren;
          }
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      // Check for nested objects that might contain layers
      if (isComponentLayer(value)) {
        if (value.id === layerId) {
          return value;
        }
        const foundInChildren = findLayerRecursive([value], layerId);
        if (foundInChildren) {
          return foundInChildren;
        }
      }
      // Check for objects that might have children-like structure
      if (
        Array.isArray((value as any).children) &&
        typeof (value as any).children !== 'string'
      ) {
        const foundInChildren = findLayerRecursive(
          (value as any).children,
          layerId,
        );
        if (foundInChildren) {
          return foundInChildren;
        }
      }
    }
  }

  return undefined;
};
