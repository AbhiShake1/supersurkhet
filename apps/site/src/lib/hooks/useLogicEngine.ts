import { logicEngine, type LogicExpr } from '@/lib/language/core';
import { useAuth } from '@/components/auth-provider';
import { useBusiness } from '@/contexts/business-context';
import type { Business, User } from '../schema';
// import { db } from "@/lib/ssr/api";

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export type LogicEngineContext<T extends Record<string, any>> = {
  user: User;
  business: Business;
  // db: typeof db;
} & T;

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export type LogicExprWithContext<T extends Record<string, any>> = LogicExpr<
  LogicEngineContext<T>
>;

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export function useLogicEngine<T extends Record<string, any>>(
  initialContext?: Partial<LogicEngineContext<T>>,
) {
  'use memo';
  const { user } = useAuth();
  const { business } = useBusiness();

  if (!user)
    throw new Error(
      `You are trying to access user without being logged in. [in useLogicEngine]`,
    );

  const context = {
    // db,
    user,
    business,
    ...initialContext,
  };

  return {
    logicEngine: {
      ...logicEngine,
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      // biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
      build<T extends Record<string, any> = {}>(
        param: Parameters<typeof logicEngine.build<T & typeof context>>[0],
      ) {
        const result = logicEngine.build<T & typeof context>(param);
        return (data: T = {} as T) => result({ ...context, ...data });
      },
      run(
        param: Parameters<typeof logicEngine.run>[0],
        data: Partial<Parameters<typeof logicEngine.run>>,
      ) {
        return logicEngine.run(param, { ...context, ...data });
      },
    },
  };
}
