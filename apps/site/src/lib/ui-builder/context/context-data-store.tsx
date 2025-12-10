import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import _ from 'lodash';

interface ContextData {
  [key: string]: any;
}

interface ContextDataStoreProps {
  children: ReactNode;
  contextData: ContextData;
}

interface ContextDataReturn {
  context: ContextData;
}

export function flattenObject(
  obj: Record<string, any>,
  prefix = ""
): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}_${key}` : key;

    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      Object.assign(result, flattenObject(value, path));
    } else {
      result[path] = value;
    }
  }

  return result;
}

function omitNonSerializables(obj: Record<string, any>): Record<string, any> {
  return _.omitBy(obj, (value) => {
    return (
      value === null ||
      typeof value === "undefined" ||
      typeof value === "function"
    );
  });
}

export const ContextDataStoreContext = createContext<ContextDataReturn | undefined>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({
  children,
  contextData,
}) => {
  const parentContext = useContext(ContextDataStoreContext)?.context;

  const merged = useMemo(() => ({ ...parentContext, ...contextData }), [parentContext, contextData]);

  const serializable = useMemo(() => omitNonSerializables(merged), [merged]);

  return (
    <ContextDataStoreContext.Provider value={{
      context: serializable,
    }}>
      {children}
    </ContextDataStoreContext.Provider>
  );
};

export const useContextData = (): ContextDataReturn => {
  return useContext(ContextDataStoreContext) ?? {
    context: {},
  };
};
