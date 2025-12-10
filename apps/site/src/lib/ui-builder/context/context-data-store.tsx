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

type Serializable = Record<string, any>;

// export function makeSerializable(obj: any): Serializable {
//   const seen = new WeakSet();
//
//   return _.cloneDeepWith(obj, (value) => {
//     if (value && typeof value === "object") {
//       if (seen.has(value)) {
//         return
//       }
//       // seen.add(value);
//     }
//   });
// }

export function makeSerializable(
  obj: Record<string, any>,
  maxDepth = 3
): Record<string, any> {
  function clean(value: any, depth: number): any {
    if (
      value === null ||
      typeof value === "undefined" ||
      typeof value === "function"
    ) {
      return undefined;
    }

    if (typeof value !== "object") {
      return value;
    }

    // omit if deeper than maxDepth
    if (depth > maxDepth) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const arr = value.map((v) => clean(v, depth + 1)).filter((v) => v !== undefined);
      return arr.length ? arr : undefined;
    }

    const cleaned = _.transform(value, (result, val, key) => {
      const c = clean(val, depth + 1);
      if (c !== undefined) result[key] = c;
    }, {} as Record<string, any>);

    return _.isEmpty(cleaned) ? undefined : cleaned;
  }

  return clean(obj, 1) as Record<string, any>;
}

// function makeSerializable(obj: Record<string, any>): Record<string, any> {
//   return _.omitBy(obj, (value) => {
//     return (
//       value === null ||
//       typeof value === "undefined" ||
//       typeof value === "function"
//     );
//   });
// }

export const ContextDataStoreContext = createContext<ContextDataReturn | undefined>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({
  children,
  contextData,
}) => {
  const parentContext = useContext(ContextDataStoreContext)?.context;

  const merged = useMemo(() => ({ ...parentContext, ...contextData }), [parentContext, contextData]);

  const serializable = useMemo(() => makeSerializable(merged), [merged]);

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
