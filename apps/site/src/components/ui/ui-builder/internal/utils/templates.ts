import { hasLayerChildren } from '@/lib/ui-builder/store/layer-utils';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';

// Helper function to convert display name to valid JavaScript identifier

export const generateLayerCode = (
  layer: ComponentLayer,
  indent = 0,
): string => {
  const indentation = '  '.repeat(indent);

  let childrenCode = '';
  if (hasLayerChildren(layer) && layer.children.length > 0) {
    childrenCode = layer.children
      .map((child) => generateLayerCode(child, indent + 1))
      .join('\n');
  }
  //else if children is a string, then we need render children as a text node
  else if (typeof layer.children === 'string') {
    childrenCode = `${indentation}${'  '}{${JSON.stringify(layer.children)}}`;
  }

  if (childrenCode) {
    return `${indentation}<${layer.type}${generatePropsString(
      layer.props,
    )}>\n${childrenCode}\n${indentation}</${layer.type}>`;
  } else {
    return `${indentation}<${layer.type}${generatePropsString(layer.props)} />`;
  }
};

export const generatePropsString = (props: Record<string, any>): string => {
  const propsArray = Object.entries(props)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => {
      let propValue;
      if (typeof value === 'string') {
        propValue = `"${value}"`;
      } else if (typeof value === 'number') {
        propValue = `{${value}}`;
      } else {
        propValue = `{${JSON.stringify(value)}}`;
      }
      return `${key}=${propValue}`;
    });

  return propsArray.length > 0 ? ` ${propsArray.join(' ')}` : '';
};
