/**
 * @fileoverview Main entry point for the enhanced logic engine
 *
 * This module provides the core functionality of the enhanced logic engine,
 * including the main engine instance, helper functions, and type definitions
 * for creating and executing JSON-based business logic expressions.
 */

import { LogicEngine } from './engine';
import type { LogicExpr } from './types';

/**
 * Default instance of the LogicEngine with function support enabled.
 *
 * This pre-configured instance enables function calling capabilities
 * and can be used directly for most common use cases.
 */
const logicEngine = new LogicEngine(
  {},
  { allowFunctions: true, permissive: true },
);

// Export the engine and types
export { LogicEngine, logicEngine };
export type { LogicExpr };

/**
 * Creates a function from a JSON logic expression with type inference.
 *
 * This helper function provides a convenient way to create executable
 * functions from JSON logic expressions with full type safety.
 *
 * @template TVars - Type of the data context
 * @template TResult - Expected return type of the function
 * @param logic - The JSON logic expression to convert to a function
 * @returns A function that executes the logic when called with data
 *
 * @example
 * ```ts
 * // Create a reusable tax calculator
 * const calculateTax = createLogicFn({
 *   '*': [
 *     { var: 'income' },
 *     { var: 'rate' }
 *   ]
 * });
 *
 * const tax = calculateTax({ income: 50000, rate: 0.2 }); // 10000
 *
 * // Create a validation function
 * const isValidAge = createLogicFn({
 *   and: [
 *     { '>=': [{ var: 'age' }, 0] },
 *     { '<=': [{ var: 'age' }, 150] }
 *   ]
 * });
 *
 * isValidAge({ age: 25 }); // true
 * isValidAge({ age: -5 }); // false
 * ```
 */
export function createLogicFn<TVars = any, TResult = unknown>(
  logic: LogicExpr<TVars>,
): (data: TVars) => TResult {
  return logicEngine.build<TVars, TResult>(logic);
}

/**
 * Creates a logic definition object with run and build methods.
 *
 * This helper provides a structured way to define logic expressions
 * with both immediate execution and compiled function capabilities.
 *
 * @template TVars - Type of the data context
 * @template TResult - Expected return type of the logic
 * @param logic - The JSON logic expression to define
 * @returns Object containing the logic and helper methods
 *
 * @example
 * ```ts
 * // Define a complex business rule
 * const discountRule = defineLogic({
 *   if: [
 *     { '>=': [{ var: 'total' }, 100] },
 *     { '*': [{ var: 'total' }, 0.9] }, // 10% discount
 *     { var: 'total' } // no discount
 *   ]
 * });
 *
 * // Execute immediately
 * const discountedTotal = discountRule.run({ total: 150 }); // 135
 *
 * // Compile to a reusable function
 * const calculateDiscount = discountRule.build();
 * const result1 = calculateDiscount({ total: 200 }); // 180
 * const result2 = calculateDiscount({ total: 50 }); // 50
 * ```
 */
export function defineLogic<TVars = any, TResult = unknown>(
  logic: LogicExpr<TVars>,
) {
  return {
    logic,
    /**
     * Executes the logic expression immediately with the provided data.
     *
     * @param data - The data context to evaluate the logic against
     * @returns The result of evaluating the logic expression
     */
    run: (data: TVars): TResult => logicEngine.run<TResult, TVars>(logic, data),

    /**
     * Compiles the logic expression into a reusable function.
     *
     * @returns A function that executes the logic when called with data
     */
    build: (): ((data: TVars) => TResult) =>
      logicEngine.build<TVars, TResult>(logic),
  };
}
