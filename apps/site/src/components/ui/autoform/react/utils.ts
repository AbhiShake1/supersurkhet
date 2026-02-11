import type { FieldConfig } from '@autoform/core';
import { fieldConfig as zodBaseFieldConfig } from '@autoform/zod';
import type React from 'react';
import type { ReactNode } from 'react';
import type { FieldWrapperProps } from './types';

export function buildZodFieldConfig<
  FieldTypes = string,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  CustomData = Record<string, any>,
>(): (
  config: FieldConfig<
    ReactNode,
    FieldTypes,
    React.ComponentType<FieldWrapperProps>,
    CustomData
  >,
) => ReturnType<typeof zodBaseFieldConfig> {
  return (config) =>
    zodBaseFieldConfig<
      ReactNode,
      FieldTypes,
      React.ComponentType<FieldWrapperProps>,
      CustomData
    >(config);
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function getPathInObject(obj: any, path: string[]): any {
  let current = obj;
  for (const key of path) {
    current = current[key];

    if (current === undefined) {
      return undefined;
    }
  }
  return current;
}

export function formatTestId(path: string[]) {
  return path.join('__').replace(/[^a-zA-Z0-9_-]/g, '_');
}
