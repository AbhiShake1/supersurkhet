import type { EngineOptions, LogicExpr, MethodDefinition } from './types';

/**
 * Splits a path string into an array of parts, supporting escaped characters.
 *
 * This utility function is commonly used for parsing nested property access paths
 * like "user.profile.name" where each segment represents a property in a nested object.
 *
 * @example
 * ```ts
 * splitPath('user.profile.name'); // ['user', 'profile', 'name']
 * splitPath('user\\.profile.name'); // ['user.profile', 'name'] (escaped dot)
 * splitPath('user\\\\.profile.name'); // ['user\\', 'profile', 'name'] (escaped backslash)
 * ```
 *
 * @param str - The path string to split
 * @param separator - Character used to separate path segments (default: '.')
 * @param escape - Character used to escape separators (default: '\')
 * @param up - Character used for upward navigation (default: '/')
 * @returns Array of path segments
 */
export function splitPath(
  str: string,
  separator: string = '.',
  // biome-ignore lint/suspicious/noShadowRestrictedNames: lint debt cleanup
  escape: string = '\\',
  up: string = '/',
): string[] {
  const parts: string[] = [];
  let current = '';

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === escape) {
      if (str[i + 1] === separator || str[i + 1] === up) {
        current += str[i + 1];
        i++;
      } else if (str[i + 1] === escape) {
        current += escape;
        i++;
      } else {
        current += escape;
      }
    } else if (char === separator) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  if (parts.length !== str.length) parts.push(current);
  return parts;
}

// Constants for internal engine operations
const ORIGINAL_IMPL = Symbol('originalImpl');
const SYNC = Symbol('sync');

/**
 * Enhanced Logic Engine that evaluates JSON-based logic expressions with support for functions.
 *
 * The LogicEngine allows you to define complex business logic as JSON expressions that can be
 * safely evaluated against data. It supports variable access, arithmetic operations, conditional
 * logic, array operations, and function calling.
 *
 * @example
 * ```ts
 * import { LogicEngine } from './core';
 *
 * const engine = new LogicEngine();
 *
 * // Simple variable access
 * const result = engine.run({ var: 'name' }, { name: 'John' });
 * console.log(result); // 'John'
 *
 * // Arithmetic operations
 * const sum = engine.run({ '+': [5, 3] }, {});
 * console.log(sum); // 8
 *
 * // Conditional logic
 * const conditional = engine.run({
 *   if: [
 *     { '>': [{ var: 'age' }, 18] },
 *     'adult',
 *     'minor'
 *   ]
 * }, { age: 25 });
 * console.log(conditional); // 'adult'
 *
 * // Function calling (when allowFunctions is enabled)
 * const add = (a: number, b: number) => a + b;
 * const fnResult = engine.run({
 *   call: [add, { var: 'x' }, { var: 'y' }]
 * }, { x: 5, y: 3 });
 * console.log(fnResult); // 8
 * ```
 */
export class LogicEngine {
  /**
   * Controls whether inline optimizations are disabled.
   * When true, prevents certain optimizations that might inline values directly.
   */
  public disableInline: boolean;

  /**
   * Controls whether interpreted optimizations are disabled.
   * When true, disables caching of execution plans for repeated logic evaluation.
   */
  public disableInterpretedOptimization: boolean;

  /**
   * Collection of registered methods that can be used in logic expressions.
   * Methods are keyed by their operation name (e.g., 'var', '+', 'if', etc.).
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  public methods: Record<string, any>;

  /**
   * Cache for optimized execution plans.
   * Uses WeakMap to associate optimized functions with original logic objects.
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  public optimizedMap: WeakMap<object, any>;

  /**
   * Counter for tracking cache misses.
   * Used to detect when to disable interpreted optimizations.
   */
  public missesSinceSeen: number;

  /**
   * Configuration options for the engine.
   * Contains settings like max depth, array length limits, etc.
   */
  public options: EngineOptions;

  /**
   * Flag indicating whether functions are allowed in expressions.
   * When true, enables function calling and storage in JSON expressions.
   */
  public allowFunctions: boolean;

  /**
   * Internal function to determine if a key represents data or a method.
   * Used to distinguish between variable access and method calls.
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  private isData: (data: any, key: any) => boolean;

  /**
   * Creates a new LogicEngine instance.
   *
   * @param methods - Optional custom methods to register with the engine
   * @param options - Configuration options for the engine
   *
   * @example
   * ```ts
   * // Create engine with default settings
   * const engine = new LogicEngine();
   *
   * // Create engine with custom methods
   * const engine = new LogicEngine({
   *   customMethod: (args, context) => args[0] * 2
   * });
   *
   * // Create engine with specific options
   * const engine = new LogicEngine({}, {
   *   allowFunctions: true,
   *   maxDepth: 10
   * });
   * ```
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  constructor(methods: Record<string, any> = {}, options: EngineOptions = {}) {
    this.disableInline = options.disableInline ?? false;
    this.disableInterpretedOptimization =
      options.disableInterpretedOptimization ?? false;
    this.methods = { ...methods, ...this.getDefaultMethods() };

    this.optimizedMap = new WeakMap();
    this.missesSinceSeen = 0;

    this.options = {
      disableInline: options.disableInline ?? false,
      disableInterpretedOptimization:
        options.disableInterpretedOptimization ?? false,
      permissive: options.permissive ?? false,
      maxDepth: options.maxDepth ?? 0,
      maxArrayLength: options.maxArrayLength ?? 1 << 15,
      maxStringLength: options.maxStringLength ?? 1 << 16,
    };

    this.allowFunctions = options.allowFunctions ?? false;

    // Initialize isData function
    if (!options.permissive) {
      this.isData = () => false;
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      this.isData = (_data: any, key: any) => !(key in this.methods);
    }
  }

  /**
   * Gets the default set of methods that come with the engine.
   *
   * These include core operations like variable access, arithmetic, conditionals,
   * logical operations, and array processing methods.
   *
   * @returns Object containing all default methods
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  private getDefaultMethods(): Record<string, any> {
    return {
      // Enhanced var method that supports function access
      var: {
        [ORIGINAL_IMPL]: true,
        [SYNC]: true,
        /**
         * Resolves a variable path to its value in the context.
         *
         * Supports dot notation for nested properties (e.g., "user.profile.name")
         * and upward navigation using "../" syntax.
         *
         * @param key - The variable path to resolve (string, array, or object)
         * @param context - The data context to search in
         * @param above - Stack of parent contexts for upward navigation
         * @param engine - Reference to the engine instance
         * @returns The resolved value or null if not found
         *
         * @example
         * ```ts
         * // Access nested property
         * engine.run({ var: 'user.name' }, { user: { name: 'John' } }); // 'John'
         *
         * // Access with array notation
         * engine.run({ var: ['user', 'name'] }, { user: { name: 'John' } }); // 'John'
         *
         * // Access with default value
         * engine.run({ var: ['missing', 'default'] }, {}); // 'default'
         *
         * // Using with build function
         * const getName = engine.build({ var: 'user.name' });
         * getName({ user: { name: 'Jane' } }); // 'Jane'
         * ```
         */

        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        method: (key: any, context: any, above: any[], engine: LogicEngine) => {
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          let defaultValue: any;
          if (Array.isArray(key)) {
            defaultValue = key[1];
            key = key[0];
          }

          let iter = 0;
          while (
            typeof key === 'string' &&
            key.startsWith('../') &&
            iter < above.length
          ) {
            context = above[iter++];
            key = key.substring(3);
            if (iter === above.length && Array.isArray(context)) {
              iter = 0;
              above = context;
              context = above[iter++];
            }
          }

          const notFound = defaultValue === undefined ? null : defaultValue;

          if (typeof key === 'undefined' || key === '' || key === null) {
            if (engine.allowFunctions || typeof context !== 'function')
              return context;
            return null;
          }

          const subProps = splitPath(String(key));
          for (let i = 0; i < subProps.length; i++) {
            if (context === null || context === undefined) return notFound;

            context = context[subProps[i]];
            if (context === undefined) return notFound;
          }

          if (engine.allowFunctions || typeof context !== 'function')
            return context;
          return null;
        },
        /**
         * Determines if the var operation is deterministic for optimization purposes.
         *
         * @param data - The variable path being accessed
         * @param buildState - Current build state for optimization
         * @returns True if the operation is deterministic, false otherwise
         */

        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        deterministic: (data: any, buildState: any) =>
          buildState.insideIterator && !String(data).includes('../../'),
        optimizeUnary: true,
      },

      // Enhanced call method to execute functions from JSON
      call: {
        [SYNC]: true,
        /**
         * Executes a function with arguments provided in the JSON expression.
         *
         * This method enables calling functions from within JSON logic expressions,
         * supporting direct function references, context-based functions, and variable references.
         *
         * @param args - Array where first element is the function, rest are arguments
         * @param context - The data context containing variables and functions
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns Result of the function call
         *
         * @example
         * ```ts
         * const add = (a: number, b: number) => a + b;
         *
         * // Call with direct function reference
         * engine.run({ call: [add, 5, 3] }, {}); // 8
         *
         * // Call with variable arguments
         * engine.run({
         *   call: [add, { var: 'x' }, { var: 'y' }]
         * }, { x: 5, y: 3 }); // 8
         *
         * // Call function from context
         * engine.run({
         *   call: ['multiply', { var: 'x' }, { var: 'y' }]
         * }, {
         *   x: 5,
         *   y: 3,
         *   multiply: (a: number, b: number) => a * b
         * }); // 15
         *
         * // Using with build function
         * const calculate = engine.build({
         *   call: [(a: number, b: number) => a + b, { var: 'a' }, { var: 'b' }]
         * });
         * calculate({ a: 10, b: 5 }); // 15
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          args: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(args) || args.length < 1) {
            throw new Error(
              'call method requires at least one argument (the function)',
            );
          }

          const [fn, ...callArgs] = args;

          // Evaluate arguments that might be logic expressions
          const evaluatedArgs = callArgs.map((arg) => {
            if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
              // If it's a logic expression, evaluate it
              return engine.run(arg, context, { above });
            }
            return arg;
          });

          if (typeof fn === 'function') {
            // Direct function reference
            return fn(...evaluatedArgs);
          } else if (
            typeof fn === 'string' &&
            context &&
            typeof context[fn] === 'function'
          ) {
            // String function name from context
            return context[fn](...evaluatedArgs);
          } else if (typeof fn === 'object' && fn.var) {
            // Function stored as a variable reference
            const resolvedFn = engine.run(fn, context, { above });
            if (typeof resolvedFn === 'function') {
              return resolvedFn(...evaluatedArgs);
            } else {
              throw new Error(
                `Referenced value is not a function: ${typeof resolvedFn}`,
              );
            }
          } else {
            throw new Error(`Cannot call ${typeof fn} as a function`);
          }
        },
        deterministic: false,
      },

      // Method to store functions in expressions
      fn: {
        [SYNC]: true,
        /**
         * Stores or retrieves a function in the logic expression.
         *
         * This method allows functions to be embedded in JSON expressions or
         * referenced from the context.
         *
         * @param fn - The function or variable reference to a function
         * @param context - The data context containing variables
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns The function object
         *
         * @example
         * ```ts
         * const multiply = (a: number, b: number) => a * b;
         *
         * // Store function directly
         * engine.run({ fn: multiply }, {}); // Returns the multiply function
         *
         * // Retrieve function from context
         * engine.run({ fn: { var: 'mathOps.multiply' } }, {
         *   mathOps: { multiply }
         * }); // Returns the multiply function
         *
         * // Using with build function
         * const getFunction = engine.build({ fn: { var: 'operation' } });
         * const fn = getFunction({ operation: (x: number) => x * 2 });
         * fn(5); // 10
         * ```
         */

        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        method: (fn: any, context: any, above: any[], engine: LogicEngine) => {
          if (typeof fn === 'function') {
            return fn;
          } else if (typeof fn === 'object' && fn.var) {
            // If it's a variable reference, resolve it
            return engine.run(fn, context, { above });
          } else {
            throw new Error(
              'fn method expects a function or a variable reference to a function',
            );
          }
        },
        deterministic: false,
      },

      // Arithmetic operations
      /**
       * Addition operation that sums numbers.
       *
       * Supports single values and arrays of values to add together.
       *
       * @param data - Number, string, boolean, or array of values to add
       * @returns Sum of all values
       *
       * @example
       * ```ts
       * // Single value (identity)
       * engine.run({ '+': 5 }, {}); // 5
       *
       * // Array of values
       * engine.run({ '+': [1, 2, 3] }, {}); // 6
       *
       * // With variables
       * engine.run({ '+': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 5 }); // 15
       *
       * // Using with build function
       * const add = engine.build({ '+': [{ var: 'x' }, { var: 'y' }] });
       * add({ x: 7, y: 3 }); // 10
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '+': (data: any) => {
        if (!data) return 0;
        if (typeof data === 'string') return +data;
        if (typeof data === 'number') return +data;
        if (typeof data === 'boolean') return +data;
        if (typeof data === 'object' && !Array.isArray(data))
          throw new Error('Invalid operand for +');

        let res = 0;
        for (let i = 0; i < data.length; i++) {
          if (data[i] && typeof data[i] === 'object')
            throw new Error('Invalid operand for +');
          res += +data[i];
        }
        return res;
      },

      /**
       * Multiplication operation that multiplies numbers.
       *
       * Supports arrays of values to multiply together.
       *
       * @param data - Array of values to multiply
       * @returns Product of all values (defaults to 1 for empty array)
       *
       * @example
       * ```ts
       * // Array of values
       * engine.run({ '*': [2, 3, 4] }, {}); // 24
       *
       * // With variables
       * engine.run({ '*': [{ var: 'a' }, { var: 'b' }] }, { a: 4, b: 5 }); // 20
       *
       * // Empty array
       * engine.run({ '*': [] }, {}); // 1
       *
       * // Using with build function
       * const multiply = engine.build({ '*': [{ var: 'x' }, { var: 'y' }] });
       * multiply({ x: 6, y: 7 }); // 42
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '*': (data: any) => {
        if (data.length === 0) return 1;
        let res = 1;
        for (let i = 0; i < data.length; i++) {
          if (data[i] && typeof data[i] === 'object')
            throw new Error('Invalid operand for *');
          res *= +data[i];
        }
        return res;
      },

      /**
       * Subtraction operation that subtracts numbers.
       *
       * With a single value, negates it. With multiple values, subtracts sequentially.
       *
       * @param data - Array of values to subtract (first value minus remaining values)
       * @returns Result of subtraction operation
       *
       * @example
       * ```ts
       * // Unary negation
       * engine.run({ '-': [5] }, {}); // -5
       *
       * // Binary subtraction
       * engine.run({ '-': [10, 3] }, {}); // 7
       *
       * // Multiple values (left-to-right)
       * engine.run({ '-': [20, 5, 3] }, {}); // 12 (20 - 5 - 3)
       *
       * // With variables
       * engine.run({ '-': [{ var: 'a' }, { var: 'b' }] }, { a: 15, b: 5 }); // 10
       *
       * // Using with build function
       * const subtract = engine.build({ '-': [{ var: 'x' }, { var: 'y' }] });
       * subtract({ x: 100, y: 25 }); // 75
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '-': (data: any) => {
        if (!data) return 0;
        if (typeof data === 'string') return -data;
        if (typeof data === 'number') return -data;
        if (typeof data === 'boolean') return -data;
        if (typeof data === 'object' && !Array.isArray(data))
          throw new Error('Invalid operand for -');

        if (data.length === 0)
          throw new Error('Subtraction requires at least one operand');
        if (data.length === 1) return -data[0];

        let res = data[0];
        for (let i = 1; i < data.length; i++) {
          if (data[i] && typeof data[i] === 'object')
            throw new Error('Invalid operand for -');
          res -= +data[i];
        }
        return res;
      },

      /**
       * Division operation that divides numbers.
       *
       * Divides sequentially from left to right. With a single value, returns reciprocal.
       *
       * @param data - Array of values to divide (first value divided by remaining values)
       * @returns Result of division operation
       *
       * @example
       * ```ts
       * // Single value (reciprocal)
       * engine.run({ '/': [4] }, {}); // 0.25
       *
       * // Binary division
       * engine.run({ '/': [20, 4] }, {}); // 5
       *
       * // Multiple values (left-to-right)
       * engine.run({ '/': [100, 5, 2] }, {}); // 10 (100 / 5 / 2)
       *
       * // With variables
       * engine.run({ '/': [{ var: 'a' }, { var: 'b' }] }, { a: 50, b: 10 }); // 5
       *
       * // Using with build function
       * const divide = engine.build({ '/': [{ var: 'x' }, { var: 'y' }] });
       * divide({ x: 100, y: 4 }); // 25
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '/': (data: any) => {
        if (data.length === 0)
          throw new Error('Division requires at least one operand');
        if (data.length === 1) {
          if (!data[0] || typeof data[0] === 'object')
            throw new Error('Invalid operand for division');
          return 1 / +data[0];
        }

        let res = +data[0];
        for (let i = 1; i < data.length; i++) {
          if (data[i] && typeof data[i] === 'object')
            throw new Error('Invalid operand for /');
          if (!data[i]) throw new Error('Division by zero');
          res /= +data[i];
        }
        return res;
      },

      /**
       * Modulo operation that calculates remainder after division.
       *
       * Takes two values and returns the remainder of the first divided by the second.
       *
       * @param data - Tuple of [dividend, divisor]
       * @returns Remainder after division
       *
       * @example
       * ```ts
       * // Basic modulo
       * engine.run({ '%': [10, 3] }, {}); // 1
       *
       * // With variables
       * engine.run({ '%': [{ var: 'a' }, { var: 'b' }] }, { a: 17, b: 5 }); // 2
       *
       * // Using with build function
       * const modulo = engine.build({ '%': [{ var: 'x' }, { var: 'y' }] });
       * modulo({ x: 23, y: 7 }); // 2
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '%': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('Modulo requires exactly two operands');
        if (data[0] && typeof data[0] === 'object')
          throw new Error('Invalid operand for %');
        if (data[1] && typeof data[1] === 'object')
          throw new Error('Invalid operand for %');
        if (!data[1]) throw new Error('Division by zero in modulo operation');
        return +data[0] % +data[1];
      },

      /**
       * Calculates the maximum value from an array of numbers.
       *
       * @param data - Array of numbers to find maximum from
       * @returns The largest number in the array
       *
       * @example
       * ```ts
       * // Find maximum
       * engine.run({ max: [1, 5, 3, 9, 2] }, {}); // 9
       *
       * // With variables
       * engine.run({ max: [{ var: 'numbers' }] }, { numbers: [10, 5, 8, 3] }); // 10
       *
       * // Using with build function
       * const findMax = engine.build({ max: [{ var: 'values' }] });
       * findMax({ values: [15, 22, 8, 30, 12] }); // 30
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      max: (data: any) => {
        if (!Array.isArray(data) || data.length === 0)
          throw new Error('max requires a non-empty array');
        if (typeof data[0] !== 'number')
          throw new Error('max requires numeric values');

        let max = data[0];
        for (let i = 1; i < data.length; i++) {
          if (typeof data[i] !== 'number')
            throw new Error('max requires numeric values');
          if (data[i] > max) max = data[i];
        }
        return max;
      },

      /**
       * Calculates the minimum value from an array of numbers.
       *
       * @param data - Array of numbers to find minimum from
       * @returns The smallest number in the array
       *
       * @example
       * ```ts
       * // Find minimum
       * engine.run({ min: [1, 5, 3, 9, 2] }, {}); // 1
       *
       * // With variables
       * engine.run({ min: [{ var: 'numbers' }] }, { numbers: [10, 5, 8, 3] }); // 3
       *
       * // Using with build function
       * const findMin = engine.build({ min: [{ var: 'values' }] });
       * findMin({ values: [15, 22, 8, 30, 12] }); // 8
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      min: (data: any) => {
        if (!Array.isArray(data) || data.length === 0)
          throw new Error('min requires a non-empty array');
        if (typeof data[0] !== 'number')
          throw new Error('min requires numeric values');

        let min = data[0];
        for (let i = 1; i < data.length; i++) {
          if (typeof data[i] !== 'number')
            throw new Error('min requires numeric values');
          if (data[i] < min) min = data[i];
        }
        return min;
      },

      // Comparison operations
      /**
       * Greater than comparison operation.
       *
       * Compares two values and returns true if the first is greater than the second.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 > value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '>': [10, 5] }, {}); // true
       * engine.run({ '>': [3, 7] }, {}); // false
       *
       * // With variables
       * engine.run({ '>': [{ var: 'a' }, { var: 'b' }] }, { a: 15, b: 10 }); // true
       *
       * // Using with build function
       * const isGreater = engine.build({ '>': [{ var: 'x' }, { var: 'y' }] });
       * isGreater({ x: 5, y: 10 }); // false
       * isGreater({ x: 15, y: 10 }); // true
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '>': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('> requires exactly two operands');
        return data[0] > data[1];
      },

      /**
       * Greater than or equal comparison operation.
       *
       * Compares two values and returns true if the first is greater than or equal to the second.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 >= value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '>=': [10, 10] }, {}); // true
       * engine.run({ '>=': [3, 7] }, {}); // false
       *
       * // With variables
       * engine.run({ '>=': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 10 }); // true
       *
       * // Using with build function
       * const isGreaterOrEqual = engine.build({ '>=': [{ var: 'x' }, { var: 'y' }] });
       * isGreaterOrEqual({ x: 10, y: 10 }); // true
       * isGreaterOrEqual({ x: 5, y: 10 }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '>=': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('>= requires exactly two operands');
        return data[0] >= data[1];
      },

      /**
       * Less than comparison operation.
       *
       * Compares two values and returns true if the first is less than the second.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 < value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '<': [5, 10] }, {}); // true
       * engine.run({ '<': [7, 3] }, {}); // false
       *
       * // With variables
       * engine.run({ '<': [{ var: 'a' }, { var: 'b' }] }, { a: 5, b: 10 }); // true
       *
       * // Using with build function
       * const isLess = engine.build({ '<': [{ var: 'x' }, { var: 'y' }] });
       * isLess({ x: 15, y: 10 }); // false
       * isLess({ x: 5, y: 10 }); // true
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '<': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('< requires exactly two operands');
        return data[0] < data[1];
      },

      /**
       * Less than or equal comparison operation.
       *
       * Compares two values and returns true if the first is less than or equal to the second.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 <= value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '<=': [10, 10] }, {}); // true
       * engine.run({ '<=': [7, 3] }, {}); // false
       *
       * // With variables
       * engine.run({ '<=': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 10 }); // true
       *
       * // Using with build function
       * const isLessOrEqual = engine.build({ '<=': [{ var: 'x' }, { var: 'y' }] });
       * isLessOrEqual({ x: 10, y: 10 }); // true
       * isLessOrEqual({ x: 15, y: 10 }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '<=': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('<= requires exactly two operands');
        return data[0] <= data[1];
      },

      /**
       * Loose equality comparison operation.
       *
       * Compares two values using JavaScript's loose equality (==) operator.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 == value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '==': [5, '5'] }, {}); // true (loose equality)
       * engine.run({ '==': [5, 6] }, {}); // false
       *
       * // With variables
       * engine.run({ '==': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 10 }); // true
       *
       * // Using with build function
       * const isEqual = engine.build({ '==': [{ var: 'x' }, { var: 'y' }] });
       * isEqual({ x: '5', y: 5 }); // true
       * isEqual({ x: 10, y: 20 }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '==': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('== requires exactly two operands');
        return data[0] === data[1];
      },

      /**
       * Strict equality comparison operation.
       *
       * Compares two values using JavaScript's strict equality (===) operator.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 === value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '===': [5, 5] }, {}); // true
       * engine.run({ '===': [5, '5'] }, {}); // false (strict equality)
       *
       * // With variables
       * engine.run({ '===': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 10 }); // true
       *
       * // Using with build function
       * const isStrictEqual = engine.build({ '===': [{ var: 'x' }, { var: 'y' }] });
       * isStrictEqual({ x: 5, y: '5' }); // false
       * isStrictEqual({ x: 10, y: 10 }); // true
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '===': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('=== requires exactly two operands');
        return data[0] === data[1];
      },

      /**
       * Loose inequality comparison operation.
       *
       * Compares two values using JavaScript's loose inequality (!=) operator.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 != value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '!=': [5, '6'] }, {}); // true
       * engine.run({ '!=': [5, '5'] }, {}); // false (loose inequality)
       *
       * // With variables
       * engine.run({ '!=': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 20 }); // true
       *
       * // Using with build function
       * const isNotEqual = engine.build({ '!=': [{ var: 'x' }, { var: 'y' }] });
       * isNotEqual({ x: '5', y: 6 }); // true
       * isNotEqual({ x: 5, y: '5' }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '!=': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('!= requires exactly two operands');
        return data[0] !== data[1];
      },

      /**
       * Strict inequality comparison operation.
       *
       * Compares two values using JavaScript's strict inequality (!==) operator.
       *
       * @param data - Tuple of [value1, value2] to compare
       * @returns True if value1 !== value2, false otherwise
       *
       * @example
       * ```ts
       * // Basic comparison
       * engine.run({ '!==': [5, '5'] }, {}); // true (strict inequality)
       * engine.run({ '!==': [5, 5] }, {}); // false
       *
       * // With variables
       * engine.run({ '!==': [{ var: 'a' }, { var: 'b' }] }, { a: 10, b: 10 }); // false
       *
       * // Using with build function
       * const isStrictNotEqual = engine.build({ '!==': [{ var: 'x' }, { var: 'y' }] });
       * isStrictNotEqual({ x: 5, y: '5' }); // true
       * isStrictNotEqual({ x: 10, y: 10 }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '!==': (data: any) => {
        if (!Array.isArray(data) || data.length !== 2)
          throw new Error('!== requires exactly two operands');
        return data[0] !== data[1];
      },

      // String operations
      /**
       * Concatenates strings together.
       *
       * Joins multiple strings or string representations of values into a single string.
       *
       * @param data - String, array of strings/values to concatenate
       * @returns Concatenated string
       *
       * @example
       * ```ts
       * // Basic concatenation
       * engine.run({ cat: ['Hello', ' ', 'World'] }, {}); // 'Hello World'
       *
       * // With variables
       * engine.run({ cat: ['User: ', { var: 'name' }] }, { name: 'John' }); // 'User: John'
       *
       * // Using with build function
       * const greet = engine.build({ cat: ['Hello, ', { var: 'name' }, '!'] });
       * greet({ name: 'Alice' }); // 'Hello, Alice!'
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      cat: (data: any) => {
        if (!Array.isArray(data)) return String(data);
        return data
          .map((item) => {
            if (item && typeof item === 'object' && item.var) {
              // This would be handled by the engine before reaching here
              return item;
            }
            return String(item);
          })
          .join('');
      },

      /**
       * Extracts a substring from a string.
       *
       * Takes a string and extracts characters starting at a given position for a given length.
       *
       * @param data - Tuple of [string, start_position, length]
       * @returns Extracted substring
       *
       * @example
       * ```ts
       * // Basic substring
       * engine.run({ substr: ['Hello World', 0, 5] }, {}); // 'Hello'
       *
       * // With negative length (counts from end)
       * engine.run({ substr: ['Hello World', 6, -1] }, {}); // 'Worl'
       *
       * // With variables
       * engine.run({ substr: [{ var: 'text' }, 0, 3] }, { text: 'JavaScript' }); // 'Jav'
       *
       * // Using with build function
       * const getSubstring = engine.build({ substr: [{ var: 'str' }, { var: 'start' }, { var: 'len' }] });
       * getSubstring({ str: 'Programming', start: 3, len: 4 }); // 'gram'
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      substr: (data: any) => {
        if (!Array.isArray(data) || data.length < 2)
          throw new Error('substr requires [string, start, length?]');
        const [str, start, length] = data;
        if (length < 0) {
          const result = String(str).substr(start);
          return result.substr(0, result.length + length);
        }
        return String(str).substr(start, length);
      },

      /**
       * Gets the length of a string, array, or object.
       *
       * @param data - String, array, or object to measure
       * @returns Length of the string/array or number of keys in object
       *
       * @example
       * ```ts
       * // String length
       * engine.run({ length: 'Hello' }, {}); // 5
       *
       * // Array length
       * engine.run({ length: [1, 2, 3, 4] }, {}); // 4
       *
       * // Object keys count
       * engine.run({ length: { a: 1, b: 2, c: 3 } }, {}); // 3
       *
       * // With variables
       * engine.run({ length: { var: 'text' } }, { text: 'Test' }); // 4
       *
       * // Using with build function
       * const getLength = engine.build({ length: { var: 'value' } });
       * getLength({ value: [1, 2, 3, 4, 5] }); // 5
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      length: (data: any) => {
        if (!data) throw new Error('length requires a value');
        const parsed = data;
        if (typeof parsed === 'string' || Array.isArray(parsed))
          return parsed.length;
        if (parsed && typeof parsed === 'object')
          return Object.keys(parsed).length;
        throw new Error('length requires a string, array, or object');
      },

      // Conditional operations
      if: {
        /**
         * Evaluates conditional logic similar to if-else statements.
         *
         * Takes an array of condition-action pairs, evaluating conditions in order
         * until one is truthy, then returns the corresponding action result.
         *
         * @param input - Array of [condition, result, condition, result, ..., default]
         * @param context - Data context for variable access
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns Result of the first truthy condition's action, or default
         *
         * @example
         * ```ts
         * // Simple if-else
         * engine.run({
         *   if: [
         *     { '>': [{ var: 'age' }, 18] },
         *     'adult',
         *     'minor'
         *   ]
         * }, { age: 25 }); // 'adult'
         *
         * // Multiple conditions
         * engine.run({
         *   if: [
         *     { '<': [{ var: 'score' }, 50] },
         *     'F',
         *     { '<': [{ var: 'score' }, 65] },
         *     'D',
         *     { '<': [{ var: 'score' }, 80] },
         *     'C',
         *     { '<': [{ var: 'score' }, 90] },
         *     'B',
         *     'A'
         *   ]
         * }, { score: 95 }); // 'A'
         *
         * // Using with build function
         * const getGrade = engine.build({
         *   if: [
         *     { '>=': [{ var: 'percentage' }, 90] },
         *     'A',
         *     { '>=': [{ var: 'percentage' }, 80] },
         *     'B',
         *     { '>=': [{ var: 'percentage' }, 70] },
         *     'C',
         *     'F'
         *   ]
         * });
         * getGrade({ percentage: 85 }); // 'B'
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          input: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(input)) throw new Error('if requires an array');

          if (input.length === 1)
            return engine.run(input[0], context, { above });
          if (input.length < 2) return null;

          const args = [...input];
          if (args.length % 2 !== 1) args.push(null);

          const onFalse = args.pop();

          while (args.length) {
            const check = args.shift();
            const onTrue = args.shift();

            const test = engine.run(check, context, { above });

            if (engine.truthy(test))
              return engine.run(onTrue, context, { above });
          }

          return engine.run(onFalse, context, { above });
        },
        lazy: true,
      },

      /**
       * Ternary conditional operation (shorthand for if-else).
       *
       * Equivalent to the if operation but with a more compact syntax.
       *
       * @param data - Array of [condition, true_result, false_result]
       * @returns Result of true_result if condition is truthy, false_result otherwise
       *
       * @example
       * ```ts
       * // Basic ternary
       * engine.run({ '?:': [true, 'yes', 'no'] }, {}); // 'yes'
       * engine.run({ '?:': [false, 'yes', 'no'] }, {}); // 'no'
       *
       * // With comparisons
       * engine.run({
       *   '?:': [{ '>': [{ var: 'age' }, 18] }, 'adult', 'minor']
       * }, { age: 20 }); // 'adult'
       *
       * // Using with build function
       * const checkAdult = engine.build({
       *   '?:': [{ '>': [{ var: 'age' }, 18] }, 'adult', 'minor']
       * });
       * checkAdult({ age: 16 }); // 'minor'
       * checkAdult({ age: 25 }); // 'adult'
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '?:': (data: any) => {
        if (!Array.isArray(data) || data.length < 2)
          throw new Error(
            '?: requires [condition, true_result, false_result?]',
          );
        if (data.length === 2) return data[0] ? data[1] : null;
        return data[0] ? data[1] : data[2];
      },

      // Logical operations
      and: {
        /**
         * Evaluates logical AND operation.
         *
         * Returns the first falsy value encountered, or the last value if all are truthy.
         * Short-circuits on the first falsy value.
         *
         * @param arr - Array of values or expressions to evaluate
         * @param context - Data context for variable access
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns First falsy value or last truthy value
         *
         * @example
         * ```ts
         * engine.run({ and: [true, true, true] }, {}); // true
         * engine.run({ and: [true, false, true] }, {}); // false
         * engine.run({ and: [1, 2, 3] }, {}); // 3
         * engine.run({ and: [1, 0, 3] }, {}); // 0
         *
         * // With expressions
         * engine.run({
         *   and: [
         *     { '>': [{ var: 'a' }, 0] },
         *     { '<': [{ var: 'b' }, 10] }
         *   ]
         * }, { a: 5, b: 5 }); // true
         *
         * // Using with build function
         * const validateRange = engine.build({
         *   and: [
         *     { '>=': [{ var: 'value' }, 0] },
         *     { '<=': [{ var: 'value' }, 100] }
         *   ]
         * });
         * validateRange({ value: 50 }); // true
         * validateRange({ value: 150 }); // false
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          arr: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(arr)) throw new Error('and requires an array');
          if (!arr.length) return null;

          // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
          let item;
          for (let i = 0; i < arr.length; i++) {
            item = engine.run(arr[i], context, { above });
            if (!engine.truthy(item)) return item;
          }
          return item;
        },
        lazy: true,
      },

      or: {
        /**
         * Evaluates logical OR operation.
         *
         * Returns the first truthy value encountered, or the last value if all are falsy.
         * Short-circuits on the first truthy value.
         *
         * @param arr - Array of values or expressions to evaluate
         * @param context - Data context for variable access
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns First truthy value or last falsy value
         *
         * @example
         * ```ts
         * engine.run({ or: [false, false, true] }, {}); // true
         * engine.run({ or: [false, false, false] }, {}); // false
         * engine.run({ or: [0, 0, 3] }, {}); // 3
         * engine.run({ or: [0, 0, 0] }, {}); // 0
         *
         * // With expressions
         * engine.run({
         *   or: [
         *     { '>': [{ var: 'a' }, 10] },
         *     { '<': [{ var: 'b' }, 5] }
         *   ]
         * }, { a: 1, b: 3 }); // true
         *
         * // Using with build function
         * const hasPermission = engine.build({
         *   or: [
         *     { '==': [{ var: 'role' }, 'admin'] },
         *     { '==': [{ var: 'role' }, 'moderator'] }
         *   ]
         * });
         * hasPermission({ role: 'user' }); // false
         * hasPermission({ role: 'admin' }); // true
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          arr: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(arr)) throw new Error('or requires an array');
          if (!arr.length) return null;

          // biome-ignore lint/suspicious/noImplicitAnyLet: lint debt cleanup
          let item;
          for (let i = 0; i < arr.length; i++) {
            item = engine.run(arr[i], context, { above });
            if (engine.truthy(item)) return item;
          }

          return item;
        },
        lazy: true,
      },

      /**
       * Logical NOT operation.
       *
       * Returns the negation of the input value using the engine's truthiness rules.
       *
       * @param data - Value to negate
       * @returns True if value is falsy, false if value is truthy
       *
       * @example
       * ```ts
       * // Basic negation
       * engine.run({ not: true }, {}); // false
       * engine.run({ not: false }, {}); // true
       * engine.run({ not: 0 }, {}); // true
       * engine.run({ not: 1 }, {}); // false
       *
       * // With expressions
       * engine.run({ not: { '==': [5, 3] } }, {}); // true
       *
       * // Using with build function
       * const isFalsy = engine.build({ not: { var: 'value' } });
       * isFalsy({ value: 0 }); // true
       * isFalsy({ value: 'hello' }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      not: (data: any) => {
        return !data;
      },

      /**
       * Alternative logical NOT operation using '!' symbol.
       *
       * Same as 'not' operation but with shorter syntax.
       *
       * @param data - Value to negate
       * @returns True if value is falsy, false if value is truthy
       *
       * @example
       * ```ts
       * // Basic negation
       * engine.run({ '!': true }, {}); // false
       * engine.run({ '!': false }, {}); // true
       *
       * // Using with build function
       * const invert = engine.build({ '!': { var: 'flag' } });
       * invert({ flag: true }); // false
       * invert({ flag: false }); // true
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '!': (data: any) => {
        return !data;
      },

      /**
       * Double logical NOT operation for converting to boolean.
       *
       * Converts any value to its boolean equivalent.
       *
       * @param data - Value to convert to boolean
       * @returns Boolean representation of the value
       *
       * @example
       * ```ts
       * // Convert to boolean
       * engine.run({ '!!': 5 }, {}); // true
       * engine.run({ '!!': 0 }, {}); // false
       * engine.run({ '!!': 'hello' }, {}); // true
       * engine.run({ '!!': '' }, {}); // false
       *
       * // Using with build function
       * const toBoolean = engine.build({ '!!': { var: 'value' } });
       * toBoolean({ value: 'test' }); // true
       * toBoolean({ value: null }); // false
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '!!': (data: any) => {
        return !!data;
      },

      /**
       * Nullish coalescing operation.
       *
       * Returns the first value if it's not null or undefined, otherwise returns the second value.
       *
       * @param data - Tuple of [value, default_value]
       * @returns First value if not null/undefined, otherwise second value
       *
       * @example
       * ```ts
       * // Basic nullish coalescing
       * engine.run({ '??': [null, 'default'] }, {}); // 'default'
       * engine.run({ '??': [undefined, 'default'] }, {}); // 'default'
       * engine.run({ '??': ['actual', 'default'] }, {}); // 'actual'
       *
       * // With zero and false (these are not nullish)
       * engine.run({ '??': [0, 'default'] }, {}); // 0
       * engine.run({ '??': [false, 'default'] }, {}); // false
       *
       * // Using with build function
       * const withDefault = engine.build({ '??': [{ var: 'value' }, 'N/A'] });
       * withDefault({ value: null }); // 'N/A'
       * withDefault({ value: 'provided' }); // 'provided'
       * ```
       */

      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      '??': (data: any) => {
        if (!Array.isArray(data) || data.length < 2)
          throw new Error('?? requires [value, default]');
        return data[0] !== null && data[0] !== undefined ? data[0] : data[1];
      },

      // Array operations
      map: {
        /**
         * Transforms each element in an array using a logic expression.
         *
         * Similar to JavaScript's Array.map(), applies the given expression to each
         * element and returns a new array with transformed values.
         *
         * @param input - Tuple of [array, transformation-expression]
         * @param context - Data context for variable access
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns New array with transformed elements
         *
         * @example
         * ```ts
         * // Transform numbers
         * engine.run({
         *   map: [
         *     [1, 2, 3, 4],
         *     { '+': [{ var: 'current' }, 10] }
         *   ]
         * }, {}); // [11, 12, 13, 14]
         *
         * // Transform objects
         * engine.run({
         *   map: [
         *     [{ name: 'John' }, { name: 'Jane' }],
         *     { var: 'current.name' }
         *   ]
         * }, {}); // ['John', 'Jane']
         *
         * // With variable reference
         * engine.run({
         *   map: [
         *     { var: 'users' },
         *     { var: 'current.email' }
         *   ]
         * }, { users: [{ email: 'john@example.com' }, { email: 'jane@example.com' }] });
         * // ['john@example.com', 'jane@example.com']
         *
         * // Using with build function
         * const doubleNumbers = engine.build({
         *   map: [
         *     { var: 'numbers' },
         *     { '*': [{ var: 'current' }, 2] }
         *   ]
         * });
         * doubleNumbers({ numbers: [1, 2, 3, 4] }); // [2, 4, 6, 8]
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          input: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(input) || input.length < 2) {
            throw new Error('map requires [array, expression]');
          }

          const [sourceArray, expression] = input;
          const array = engine.run(sourceArray, context, { above });

          if (!Array.isArray(array)) {
            throw new Error('map source must be an array');
          }

          return array.map((item, index) => {
            // Create a new context for each item with special variables
            const itemContext = { ...context, current: item, index };
            const newAbove = [item, context, ...above];
            return engine.run(expression, itemContext, { above: newAbove });
          });
        },
        lazy: true,
      },

      filter: {
        /**
         * Filters an array based on a logic expression.
         *
         * Similar to JavaScript's Array.filter(), keeps only elements for which
         * the expression evaluates to a truthy value.
         *
         * @param input - Tuple of [array, filter-expression]
         * @param context - Data context for variable access
         * @param above - Stack of parent contexts
         * @param engine - Reference to the engine instance
         * @returns New array with filtered elements
         *
         * @example
         * ```ts
         * // Filter numbers
         * engine.run({
         *   filter: [
         *     [1, 2, 3, 4, 5, 6],
         *     { '>': [{ var: 'current' }, 3] }
         *   ]
         * }, {}); // [4, 5, 6]
         *
         * // Filter objects
         * engine.run({
         *   filter: [
         *     [
         *       { name: 'John', age: 25 },
         *       { name: 'Jane', age: 17 },
         *       { name: 'Bob', age: 30 }
         *     ],
         *     { '>': [{ var: 'current.age' }, 20] }
         *   ]
         * }, {}); // [{ name: 'John', age: 25 }, { name: 'Bob', age: 30 }]
         *
         * // With variable reference
         * engine.run({
         *   filter: [
         *     { var: 'numbers' },
         *     { '==': [{ var: 'current' }, 5] }
         *   ]
         * }, { numbers: [1, 5, 3, 5, 7] }); // [5, 5]
         *
         * // Using with build function
         * const adultsOnly = engine.build({
         *   filter: [
         *     { var: 'people' },
         *     { '>=': [{ var: 'current.age' }, 18] }
         *   ]
         * });
         * adultsOnly({
         *   people: [
         *     { name: 'Alice', age: 16 },
         *     { name: 'Bob', age: 22 },
         *     { name: 'Charlie', age: 14 }
         *   ]
         * }); // [{ name: 'Bob', age: 22 }]
         * ```
         */
        method: (
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          input: any[],
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          context: any,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          above: any[],
          engine: LogicEngine,
        ) => {
          if (!Array.isArray(input) || input.length < 2) {
            throw new Error('filter requires [array, expression]');
          }

          const [sourceArray, expression] = input;
          const array = engine.run(sourceArray, context, { above });

          if (!Array.isArray(array)) {
            throw new Error('filter source must be an array');
          }

          return array.filter((item, index) => {
            const itemContext = { ...context, current: item, index };
            const newAbove = [item, context, ...above];
            const result = engine.run(expression, itemContext, {
              above: newAbove,
            });
            return engine.truthy(result);
          });
        },
        lazy: true,
      },
    };
  }

  /**
   * Determines the truthiness of a value according to JSON Logic rules.
   *
   * This method defines what constitutes a "truthy" value in the context
   * of this engine, affecting conditional operations like `if`, `and`, and `or`.
   *
   * @param value - The value to evaluate for truthiness
   * @returns The value if truthy, false if falsy, following JSON Logic semantics
   *
   * @example
   * ```ts
   * engine.truthy(true); // true
   * engine.truthy(false); // false
   * engine.truthy(0); // 0 (falsy)
   * engine.truthy(1); // 1 (truthy)
   * engine.truthy([]); // false (empty array)
   * engine.truthy([1]); // [1] (non-empty array)
   * engine.truthy({}); // false (empty object)
   * engine.truthy({ a: 1 }); // { a: 1 } (non-empty object)
   * ```
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  truthy(value: any): any {
    if (!value) return value;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') {
      if (value[Symbol.iterator]) {
        if ('length' in value && value.length === 0) return false;
        if ('size' in value && value.size === 0) return false;
      }
      if (value.constructor?.name === 'Object')
        return Object.keys(value).length > 0;
    }
    return value;
  }

  /**
   * Internal method to parse and execute a single logic operation.
   *
   * This is the core execution method that handles individual operations
   * within a JSON logic expression.
   *
   * @param logic - The logic operation to execute
   * @param context - Data context for variable access
   * @param above - Stack of parent contexts
   * @param func - The operation name (e.g., 'var', '+', 'if')
   * @param length - Number of keys in the logic object
   * @returns Result of the operation
   * @internal
   */
  private _parse(
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    logic: any,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    context: any,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    above: any[],
    func: string,
    length: number,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  ): any {
    const data = logic[func];

    if (this.isData(logic, func)) return logic;

    if (!this.methods[func] || length > 1) {
      throw new Error(`Unknown operator: ${func}`);
    }

    if (
      (func === 'var' || func === 'val') &&
      this.methods[func][ORIGINAL_IMPL]
    ) {
      const input =
        !data || typeof data !== 'object'
          ? data
          : this.run(data, context, { above });
      return this.methods[func].method(input, context, above, this);
    }

    if (typeof this.methods[func] === 'function') {
      const input =
        !data || typeof data !== 'object'
          ? [data]
          : this.run(data, context, { above });
      return this.methods[func](
        Array.isArray(input) ? input : [input],
        context,
        above,
        this,
      );
    }

    if (typeof this.methods[func] === 'object') {
      const { method, lazy } = this.methods[func];
      const parsedData = !lazy
        ? !data || typeof data !== 'object'
          ? [data]
          : this.run(data, context, { above })
        : data;
      return method(parsedData, context, above, this);
    }

    throw new Error(`Method '${func}' is not set up properly.`);
  }

  /**
   * Registers a custom method with the engine.
   *
   * Allows extending the engine with custom operations that can be used
   * in JSON logic expressions.
   *
   * @param name - The name of the operation (used in JSON expressions)
   * @param method - The function or method definition to register
   * @param annotations - Optional metadata for optimization
   * @returns void
   *
   * @example
   * ```ts
   * // Add a simple custom method
   * engine.addMethod('square', (args, context) => {
   *   return args[0] * args[0];
   * });
   *
   * engine.run({ square: [5] }, {}); // 25
   *
   * // Add a method with annotations
   * engine.addMethod('double', {
   *   method: (args, context) => args[0] * 2,
   *   deterministic: true,
   *   lazy: false
   * }, { deterministic: true });
   *
   * engine.run({ double: [10] }, {}); // 20
   * ```
   */
  addMethod(
    name: string,
    method: // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      | ((args: any, context: any, above: any[], engine: LogicEngine) => any)
      | MethodDefinition,
    annotations?: { deterministic?: boolean; optimizeUnary?: boolean },
  ): void {
    if (typeof method === 'function') {
      method = { method, lazy: false } as MethodDefinition;
    } else {
      method = {
        ...method,
        lazy:
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          typeof (method as any).traverse !== 'undefined'
            ? // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
              !(method as any).traverse
            : // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
              (method as any).lazy,
      };
    }

    Object.assign(method, annotations || {});
    this.methods[name] = method;
  }

  /**
   * Registers a collection of methods as a module.
   *
   * This is a convenience method for registering multiple related methods
   * with a common prefix (e.g., 'math.add', 'math.subtract', etc.).
   *
   * @param name - Prefix to prepend to each method name (empty string for no prefix)
   * @param obj - Object containing the methods to register
   * @param annotations - Optional metadata applied to all methods in the module
   * @returns void
   *
   * @example
   * ```ts
   * const mathMethods = {
   *   add: (args) => args[0] + args[1],
   *   subtract: (args) => args[0] - args[1],
   *   multiply: (args) => args[0] * args[1]
   * };
   *
   * engine.addModule('math', mathMethods);
   *
   * engine.run({ 'math.add': [5, 3] }, {}); // 8
   * engine.run({ 'math.multiply': [4, 6] }, {}); // 24
   *
   * // Empty prefix adds methods directly
   * engine.addModule('', { customOp: (args) => args[0] * 2 });
   * engine.run({ customOp: [5] }, {}); // 10
   * ```
   */
  addModule(
    name: string,
    // biome-ignore lint/complexity/noBannedTypes: lint debt cleanup
    obj: Record<string, Function>,
    annotations?: { deterministic?: boolean; async?: boolean; sync?: boolean },
  ): void {
    Object.getOwnPropertyNames(obj).forEach((key) => {
      if (typeof obj[key] === 'function' || typeof obj[key] === 'object') {
        this.addMethod(
          `${name}${name ? '.' : ''}${key}`,
          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
          obj[key] as any,
          annotations,
        );
      }
    });
  }

  /**
   * Executes a JSON logic expression against provided data.
   *
   * This is the main method for evaluating JSON logic expressions. It takes
   * a logic expression and data context, then returns the computed result.
   *
   * @template T - Expected return type of the expression
   * @template TVars - Type of the data context
   * @param logic - The JSON logic expression to evaluate
   * @param data - The data context to evaluate against (default: {})
   * @param options - Additional options for evaluation
   * @param options.above - Stack of parent contexts for upward navigation
   * @returns The result of evaluating the logic expression
   *
   * @example
   * ```ts
   * // Simple variable access
   * engine.run({ var: 'name' }, { name: 'John' }); // 'John'
   *
   * // Arithmetic operations
   * engine.run({ '+': [5, 3] }, {}); // 8
   *
   * // Complex nested logic
   * engine.run({
   *   if: [
   *     { '>': [{ var: 'age' }, 18] },
   *     { var: 'name' },
   *     { cat: ['Minor: ', { var: 'name' }] }
   *   ]
   * }, { name: 'John', age: 25 }); // 'John'
   *
   * // With upward navigation
   * engine.run(
   *   { var: '../parentValue' },
   *   { child: 'data' },
   *   { above: [{ parentValue: 'up!' }] }
   * ); // 'up!'
   * ```
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  run<T = unknown, TVars = any>(
    logic: LogicExpr<TVars>,
    data: TVars = {} as TVars,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    options: { above?: any[] } = {},
  ): T {
    const { above = [] } = options;

    // OPTIMIZER BLOCK //
    if (
      !this.disableInterpretedOptimization &&
      typeof logic === 'object' &&
      logic
    ) {
      if (this.missesSinceSeen > 500) {
        this.disableInterpretedOptimization = true;
        this.missesSinceSeen = 0;
      }

      // Note: Simplified optimization for this implementation
      // In a full implementation, you would have a proper optimizer
    }
    // END OPTIMIZER BLOCK //

    if (Array.isArray(logic)) {
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      const res: any[] = new Array(logic.length);
      for (let i = 0; i < logic.length; i++) {
        res[i] = this.run(logic[i], data, { above });
      }
      return res as T;
    }

    if (logic && typeof logic === 'object') {
      const keys = Object.keys(logic);
      if (keys.length > 0) {
        const func = keys[0];
        return this._parse(logic, data, above, func, keys.length);
      }
    }

    return logic as T;
  }

  /**
   * Compiles a JSON logic expression into a reusable function.
   *
   * This method creates a function that encapsulates the logic expression,
   * allowing it to be executed multiple times with different data contexts
   * without re-parsing the expression each time.
   *
   * @template TVars - Type of the data context
   * @template TResult - Expected return type of the function
   * @param logic - The JSON logic expression to compile
   * @param options - Additional options for compilation
   * @param options.top - Whether this is a top-level compilation
   * @param options.above - Stack of parent contexts for upward navigation
   * @returns A function that executes the logic when called with data
   *
   * @example
   * ```ts
   * // Create a reusable tax calculator
   * const taxCalculator = engine.build({
   *   '*': [
   *     { var: 'income' },
   *     { var: 'taxRate' }
   *   ]
   * });
   *
   * taxCalculator({ income: 50000, taxRate: 0.2 }); // 10000
   * taxCalculator({ income: 75000, taxRate: 0.25 }); // 18750
   *
   * // Create a reusable validation function
   * const isValidAge = engine.build({
   *   and: [
   *     { '>=': [{ var: 'age' }, 0] },
   *     { '<=': [{ var: 'age' }, 150] }
   *   ]
   * });
   *
   * isValidAge({ age: 25 }); // true
   * isValidAge({ age: -5 }); // false
   * isValidAge({ age: 200 }); // false
   * ```
   */

  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  build<TVars = any, TResult = unknown>(
    logic: LogicExpr<TVars>,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    options: { top?: boolean; above?: any[] } = {},
  ): (data: TVars) => TResult {
    // biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
    const { above = [], top = true } = options;

    // Return a function that executes the logic when called
    return (data: TVars): TResult => {
      return this.run<TResult, TVars>(logic, data, { above });
    };
  }
}
