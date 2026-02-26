import { ChevronsUpDown, X as XIcon } from 'lucide-react';
import { useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import {
  createComponentLayer,
  hasLayerChildren,
  isComponentLayer,
} from '@/lib/ui-builder/store/layer-utils';

interface ChildrenSearchableSelectProps {
  layer: ComponentLayer;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  onChange: (value: any) => void; // This will be called with the new prop value
  optionsFilter?: (k: string) => boolean;
  fieldName?: string;
}

export function ChildrenSearchableSelect({
  layer: _l,
  optionsFilter,
  fieldName,
  onChange,
}: ChildrenSearchableSelectProps) {
  const {
    selectLayer,
    findLayerById,
    selectedLayerId,
    removeLayer,
    addComponentLayer,
    updateLayer,
  } = useLayerStore();

  // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
  const layer = findLayerById(selectedLayerId)!;

  // Get the component layers from the specific field if it's not 'children'
  const componentLayers = (() => {
    if (!fieldName || fieldName === 'children') {
      // For the 'children' field, return the layer's children
      return hasLayerChildren(layer) ? layer.children : [];
    } else {
      // For other ReactNode fields, get the component from the prop
      const propValue = layer.props?.[fieldName];
      if (isComponentLayer(propValue)) {
        // Single component layer
        return [propValue];
      } else if (Array.isArray(propValue)) {
        // Array of component layers
        return propValue.filter(isComponentLayer);
      }
      return [];
    }
  })();

  // Handle adding a component to the appropriate field
  const handleAddComponent = useCallback(
    ({
      layerType,
      parentLayerId,
      addPosition,
    }: {
      layerType: string;
      parentLayerId: string;
      addPosition?: number;
    }) => {
      if (!fieldName || fieldName === 'children') {
        // For the 'children' field, use the default add logic
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        addComponentLayer(layerType as any, parentLayerId, addPosition);
      } else {
        // For other ReactNode fields, create the component and add it to the prop
        const { registry } = useEditorStore.getState();
        const newLayer = createComponentLayer(layerType, registry, {});

        // Get the current value of the field and update it with the new component
        const currentPropValue = layer.props?.[fieldName];
        // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
        let newPropValue;

        if (isComponentLayer(currentPropValue)) {
          // Existing single component - convert to array and add
          newPropValue = [currentPropValue, newLayer];
        } else if (Array.isArray(currentPropValue)) {
          // Existing array - add to it
          if (addPosition !== undefined) {
            if (addPosition < 0) {
              newPropValue = [newLayer, ...currentPropValue];
            } else if (addPosition >= currentPropValue.length) {
              newPropValue = [...currentPropValue, newLayer];
            } else {
              newPropValue = [
                ...currentPropValue.slice(0, addPosition),
                newLayer,
                ...currentPropValue.slice(addPosition),
              ];
            }
          } else {
            newPropValue = [...currentPropValue, newLayer];
          }
        } else {
          // No existing value - set as single component
          newPropValue = newLayer;
        }

        // Update the layer in the store directly
        updateLayer(layer.id, { [fieldName]: newPropValue });

        // Also call onChange to update form state
        onChange(newPropValue ?? []);
      }
    },
    [fieldName, layer, onChange, updateLayer, addComponentLayer],
  );

  // Create a proper removal handler that can be used by ChildLayerBadge
  const handleRemoveComponent = useCallback(
    (childId: string) => {
      // Remove the component from the specific field
      if (!fieldName || fieldName === 'children') {
        removeLayer(childId); // This will remove from children array
      } else {
        // Remove from the specific ReactNode prop and update form
        const currentPropValue = layer.props?.[fieldName];
        // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
        let newPropValue;

        if (
          isComponentLayer(currentPropValue) &&
          currentPropValue.id === childId
        ) {
          // Single component - remove the entire prop
          newPropValue = undefined;
        } else if (Array.isArray(currentPropValue)) {
          // Array of components - filter out the specific one
          const filteredArray = currentPropValue.filter(
            (item) => !isComponentLayer(item) || item.id !== childId,
          );
          newPropValue = filteredArray.length > 0 ? filteredArray : undefined;
        }

        // Update the layer in the store directly
        updateLayer(layer.id, { [fieldName]: newPropValue });

        // Also call onChange to update form state
        onChange(newPropValue ?? []);
      }
    },
    [fieldName, layer, onChange, updateLayer, removeLayer],
  );

  return (
    <div className="w-full space-y-4">
      <AddComponentsPopover
        fieldName={fieldName}
        parentLayerId={layer.id}
        onChange={handleAddComponent}
        optionsFilter={optionsFilter}
      >
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between"
        >
          Add Component
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </AddComponentsPopover>

      {componentLayers && componentLayers.length > 0 && (
        <div className="w-full flex gap-2 flex-wrap">
          {/* Remove the selectedLayer condition so badges always show when there are componentLayers */}
          {componentLayers.map((child) => (
            <ChildLayerBadge
              key={child.id}
              child={child}
              selectLayer={selectLayer}
              removeLayer={() => handleRemoveComponent(child.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildLayerBadge({
  child,
  selectLayer,
  removeLayer,
}: {
  child: ComponentLayer;
  selectLayer: (id: string) => void;
  removeLayer: (id: string) => void;
}) {
  const handleSelect = useCallback(() => {
    selectLayer(child.id);
  }, [selectLayer, child.id]);

  const handleRemove = useCallback(() => {
    removeLayer(child.id);
  }, [removeLayer, child.id]);

  const layerName = nameForLayer(child);
  if (!layerName) return null;

  return (
    <Badge
      key={child.id}
      className="flex items-center space-x-2 pl-2 pr-0 py-0"
      variant="secondary"
    >
      <Button
        className="p-0 h-5"
        variant="link"
        size="sm"
        onClick={handleSelect}
      >
        {layerName}
      </Button>
      <Button
        className="p-0 size-6 rounded-full"
        variant="ghost"
        size="icon"
        onClick={handleRemove}
      >
        <XIcon className="w-4 h-4" />
      </Button>
    </Badge>
  );
}

const nameForLayer = (layer: ComponentLayer) => {
  return layer.name || layer.type?.replaceAll('_', '');
};
