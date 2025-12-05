import React, { createContext, useContext, type ReactNode } from 'react';

interface ContextData {
  [key: string]: any;
}

interface ContextDataStoreProps {
  children: ReactNode;
  contextData: ContextData;
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

export const ContextDataStoreContext = createContext<ContextData | undefined>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({
  children,
  contextData: _contextData,
}) => {
  const contextData = React.useMemo(() => {
    return {
      context: flattenObject(_contextData),
    };
  }, [_contextData]);
  return (
    <ContextDataStoreContext.Provider value={contextData}>
      {children}
    </ContextDataStoreContext.Provider>
  );
};

export const useContextData = (): ContextData => {
  return useContext(ContextDataStoreContext) ?? {};
};
