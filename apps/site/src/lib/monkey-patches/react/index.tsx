import React from "react";
import { ContextDataStore } from "@/lib/ui-builder/context/context-data-store";

const originalCreateContext = React.createContext;

const WRAPPED = Symbol("Wrapped:Provider");

(React as any).createContext = function (...args: Parameters<typeof originalCreateContext>) {
  const context = originalCreateContext.apply(this, args);

  const Provider: any = context.Provider;

  if (Provider[WRAPPED]) return context

  Provider[WRAPPED] = true;

  context.Provider = function (props: any) {
    return <ContextDataStore contextData={props?.value}>
      <Provider {...props} />
    </ContextDataStore>
  }

  return context;
};
