import _ from 'lodash';
import type React from 'react';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

interface ContextData {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  [key: string]: any;
}

interface ContextDataStoreProps {
  children: ReactNode;
  contextData: ContextData;
}

interface ContextDataReturn {
  context: ContextData;
}

export function makeSerializable(
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  obj: Record<string, any>,
  maxDepth = 3,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
): Record<string, any> {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  function clean(value: any, depth: number): any {
    if (
      value === null ||
      typeof value === 'undefined' ||
      typeof value === 'function'
    ) {
      return undefined;
    }

    if (typeof value !== 'object') {
      return value;
    }

    // omit if deeper than maxDepth
    if (depth > maxDepth) {
      return undefined;
    }

    if (Array.isArray(value)) {
      const arr = value
        .map((v) => clean(v, depth + 1))
        .filter((v) => v !== undefined);
      return arr.length ? arr : undefined;
    }

    const cleaned = _.transform(
      value,
      (result: Record<string, unknown>, val, key) => {
        const c = clean(val, depth + 1);
        if (c !== undefined) result[String(key)] = c;
      },
      {} as Record<string, unknown>,
    );

    return _.isEmpty(cleaned) ? undefined : cleaned;
  }

  return clean(obj, 1) as Record<string, unknown>;
}

export const ContextDataStoreContext = createContext<
  ContextDataReturn | undefined
>(undefined);

export const ContextDataStore: React.FC<ContextDataStoreProps> = ({
  children,
  contextData,
}) => {
  const parentContext = useContext(ContextDataStoreContext)?.context;

  const merged = useMemo(
    () => ({ ...parentContext, ...contextData }),
    [parentContext, contextData],
  );

  const serializable = useMemo(
    () =>
      _.omit(makeSerializable(merged), ['window', 'scriptLoadedSuccessfully']),
    [merged],
  );

  return (
    <ContextDataStoreContext.Provider
      value={{
        context: serializable,
      }}
    >
      {children}
    </ContextDataStoreContext.Provider>
  );
};

export const useContextData = (): ContextDataReturn => {
  return (
    useContext(ContextDataStoreContext) ?? {
      context: {},
    }
  );
};
