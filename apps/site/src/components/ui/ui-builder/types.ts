import type { ZodObject, ZodSchema } from 'zod';
import type { ComponentType as ReactComponentType, ReactNode } from 'react';
import type { FieldConfigItem } from '@/components/ui/auto-form/types';

export type {
  AutoFormInputComponentProps,
  FieldConfigItem,
} from '@/components/ui/auto-form/types';

export type PropValue =
  | ReactNode
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  | Record<string, any>
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  | any[]
  | string
  | number
  | boolean
  | null
  | undefined;

export type ComponentProps<
  TProps extends Record<string, PropValue> = Record<string, PropValue>,
> = TProps;

export interface ComponentLayer<
  TProps extends Record<string, PropValue> = Record<string, PropValue>,
> {
  id: string;
  name?: string;
  type: string;
  props: ComponentProps<TProps>;
  children: ComponentLayer[] | string;
}

// Enhanced registry entry with better component typing
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export interface RegistryEntry<T extends ReactComponentType<any>> {
  component?: T;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  schema: ZodObject<any> | ZodSchema<any>;
  from?: string;
  isFromDefaultExport?: boolean;
  defaultChildren?: ComponentLayer[] | string;
  fieldOverrides?: Record<string, FieldConfigFunction>;
}

// Improved field config function type
// biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
export type FieldConfigFunction<P = {}> = (
  layer: ComponentLayer,
  rest?: P,
) => FieldConfigItem;

// Enhanced ComponentRegistry with better typing
export type ComponentRegistry = Record<
  string,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  RegistryEntry<ReactComponentType<any>>
>;

// Type-safe layer change handler with registry awareness
export type LayerChangeHandler<
  TRegistry extends ComponentRegistry = ComponentRegistry,
> = (
  layers: Array<
    ComponentLayer & {
      type: keyof TRegistry;
    }
  >,
) => void;

// Helper types for extracting component props from registry
// Type-safe layer change handler with registry awareness
