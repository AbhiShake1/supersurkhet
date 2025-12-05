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
  useAddContextData: (context: ContextData) => void;
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

export const ContextDataStoreContext = createContext<ContextDataReturn | undefined>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({
  children,
  contextData: __contextData,
}) => {
  const [_contextData, setContextData] = React.useState(__contextData)

  function useAddContextData(context: ContextData) {
    useEffect(() => {
      const prevContext = _contextData
      setContextData(prevContext => {
        return _.merge({}, prevContext, context)
      })

      return () => {
        setContextData(prevContext)
      }
    }, [__contextData])
  }

  const contextData = useMemo(() => {
    return flattenObject(_contextData)
  }, [_contextData])

  return (
    <ContextDataStoreContext.Provider value={{
      context: contextData,
      useAddContextData,
    }}>
      {children}
    </ContextDataStoreContext.Provider>
  );
};

export const useContextData = (): ContextDataReturn => {
  return useContext(ContextDataStoreContext) ?? {
    context: {},
    useAddContextData: () => { },
  };
};
