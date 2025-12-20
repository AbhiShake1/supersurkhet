import type { ZodObject, ZodSchema } from "zod";
import type { ComponentType as ReactComponentType, ReactNode } from 'react';
import type {
  FieldConfigItem,
} from "@/components/ui/auto-form/types";

export type {
  AutoFormInputComponentProps,
  FieldConfigItem,
} from "@/components/ui/auto-form/types";

export type PropValue =
  | ReactNode
  | Record<string, any>
  | any[]
  | string
  | number
  | boolean
  | null
  | undefined;

export type ComponentProps<TProps extends Record<string, PropValue> = Record<string, PropValue>> = TProps;

export interface ComponentLayer<TProps extends Record<string, PropValue> = Record<string, PropValue>> {
  id: string;
  name?: string;
  type: string;
  props: ComponentProps<TProps>;
  children: ComponentLayer[] | string;
}

// Enhanced registry entry with better component typing
export interface RegistryEntry<T extends ReactComponentType<any>> {
  component?: T;
  schema: ZodObject<any> | ZodSchema<any>;
  from?: string;
  isFromDefaultExport?: boolean;
  defaultChildren?: ComponentLayer[] | string;
  fieldOverrides?: Record<string, FieldConfigFunction>;
}

// Improved field config function type
export type FieldConfigFunction<P = {}> = (layer: ComponentLayer, rest?: P) => FieldConfigItem;

// Enhanced ComponentRegistry with better typing
export type ComponentRegistry = Record<string, RegistryEntry<ReactComponentType<any>>>;

// Type-safe layer change handler with registry awareness
export type LayerChangeHandler<TRegistry extends ComponentRegistry = ComponentRegistry> =
  (layers: Array<ComponentLayer & {
    type: keyof TRegistry;
  }>) => void;

// Helper types for extracting component props from registry
export type ExtractComponentProps<
  TRegistry extends ComponentRegistry,
  TComponentName extends keyof TRegistry
> = TRegistry[TComponentName] extends RegistryEntry<ReactComponentType<infer TProps>>
  ? TProps
  : never;

// Type-safe layer change handler with registry awareness
export type TypedLayerChangeHandler<TRegistry extends ComponentRegistry> =
  (layers: Array<ComponentLayer & {
    type: keyof TRegistry;
  }>) => void;

