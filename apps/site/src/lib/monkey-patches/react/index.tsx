import React from 'react';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';

const originalCreateContext = React.createContext;

const WRAPPED = Symbol('Wrapped:Provider');

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
(React as any).createContext = function (
  ...args: Parameters<typeof originalCreateContext>
) {
  const context = originalCreateContext.apply(this, args);

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const Provider: any = context.Provider;

  if (Provider[WRAPPED]) return context;

  Provider[WRAPPED] = true;

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  context.Provider = (props: any) => (
    <ContextDataStore contextData={props?.value}>
      <Provider {...props} />
    </ContextDataStore>
  );

  return context;
};
