/**
 * @fileoverview Enhanced types for the logic engine
 *
 * This file defines the core type system for the enhanced logic engine,
 * including type-safe JSON expressions, recursive path extraction, and
 * function support for complex business logic operations.
 */

/**
 * Represents primitive JSON values that can be used in expressions.
 * These are the basic building blocks of JSON logic expressions.
 */
export type Primitive = string | number | boolean | null | undefined;

/**
 * Represents any valid JSON value including nested structures.
 * This type allows for arbitrarily nested objects and arrays.
 */
export type Json = Primitive | Json[] | { [key: string]: Json };

/**
 * Recursively extracts all possible paths from an object type.
 *
 * This utility type generates string literal types representing all possible
 * nested property access paths in an object, enabling type-safe variable access.
 *
 * @example
 * ```ts
 * type User = { name: string; profile: { age: number } };
 * type Paths = Path<User>; // "name" | "profile" | "profile.age"
 * ```
 *
 * @template T - The object type to extract paths from
 * @returns Union of all possible property access paths as string literals
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export  type Path<T> = T extends Record<string, any>
  ? {
      [K in keyof T]-?: K extends string
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        ? T[K] extends Record<string, any>
          ? `${K}` | `${K}.${Path<T[K]>}`
          : `${K}`
        : never;
    }[keyof T]
  : never;

/**
 * Generates all possible array paths for nested property access.
 *
 * This type creates tuple types representing nested property access using
 * array notation (e.g., ["user", "profile", "name"]).
 *
 * @example
 * ```ts
 * type User = { profile: { name: string } };
 * type ArrayPaths = ArrayPath<User>; // ["profile"] | ["profile", "name"]
 * ```
 *
 * @template T - The object type to extract array paths from
 * @returns Union of all possible array access paths as tuple types
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export  type ArrayPath<T> = T extends Record<string, any>
  ? {
      [K in keyof T]-?: K extends string
        // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
        ? T[K] extends Record<string, any>
          ? [K] | [K, ...ArrayPath<T[K]>]
          : [K]
        : never;
    }[keyof T]
  : never;

/**
 * Enhanced variable access type with improved type safety.
 *
 * Combines recursive path extraction with special keywords and array access patterns
 * to provide comprehensive type safety for variable access operations.
 *
 * @template T - The context object type to extract variables from
 */
export type VarFrom<T> =
  | Path<T>
  | 'current'
  | 'accumulator'
  | [[1 | 2 | 3 | number], ...(string | number)[]]
  | ArrayPath<T>;

/**
 * Represents a callable function that can be passed in JSON expressions.
 *
 * This type is primarily used for the 'fn' operation to store or retrieve functions,
 * since the 'call' operation now uses string-based function references.
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export  type CallableFunction = (...args: any[]) => any;

/**
 * Enhanced logic expression type with comprehensive function support.
 *
 * This type defines the structure of JSON logic expressions with full
 * type safety, supporting all standard operations plus function calling
 * and storage capabilities.
 *
 * @template TVars - The type of the data context for variable access
 *
 * @example
 * ```ts
 * // Simple variable access
 * const expr: LogicExpr<{ name: string }> = { var: "name" };
 *
 * // Function calling
 * const expr: LogicExpr<{ user: { getName: () => string } }> = {
 *   call: ["user.getName"]
 * };
 *
 * // Arithmetic operation
 * const expr: LogicExpr<{ a: number, b: number }> = {
 *   "+": [{ var: "a" }, { var: "b" }]
 * };
 *
 * // Conditional logic
 * const expr: LogicExpr<{ age: number }> = {
 *   if: [
 *     { ">": [{ var: "age" }, 18] },
 *     "adult",
 *     "minor"
 *   ]
 * };
 * ```
 */

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
export  type LogicExpr<TVars = any> =
  | Primitive
  | {
      /**
       * Variable access operation that retrieves values from the data context.
       *
       * Supports dot notation for nested properties (e.g., "user.profile.name"),
       * array notation for nested access (e.g., ["user", "name"]),
       * and special keywords like "current" and "accumulator" for array operations.
       *
       * @example
       * ```ts
       * // Simple property access
       * { var: "name" }
       *
       * // Nested property access
       * { var: "user.profile.email" }
       *
       * // Array notation
       * { var: ["user", "profile", "email"] }
       *
       * // With default value
       * { var: ["missing", "default_value"] }
       *
       * // Special keywords for array operations
       * { var: "current" } // Current item in map/filter/reduce
       * { var: "accumulator" } // Accumulator in reduce operations
       * ```
       */
      var:
        | VarFrom<TVars>
        | 'current'
        | 'accumulator'
        | [[1 | 2 | 3 | number], ...(string | number)[]]
        | ArrayPath<TVars>;
    }
  | {
      /**
       * Function calling operation that executes a function with provided arguments.
       *
       * The first element is a string path to the function in the context (e.g., "user.getName"),
       * followed by any number of arguments to pass to the function.
       * Arguments can be literal values, variable references, or nested expressions.
       *
       * @example
       * ```ts
       * // Call function from context using string path
       * { call: ["user.getName"] }
       *
       * // Call function with arguments
       * { call: ["user.greet", "Hello"] }
       *
       * // Call with variable arguments
       * { call: ["form.setValue", "name", { var: "newValue" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
call: [string, ...any[]];
    }
  | {
      /**
       * Function storage operation that stores or retrieves a function.
       *
       * Can store a direct function reference or retrieve a function from the context.
       *
       * @example
       * ```ts
       * // Store direct function
       * { fn: (x: number) => x * 2 }
       *
       * // Retrieve function from context
       * { fn: { var: "mathOperations.add" } }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
fn: (...args: any[]) => any;
    }
  | {
      /**
       * Value access operation that retrieves values with more flexible options.
       *
       * Similar to 'var' but with additional options for complex access patterns.
       *
       * @example
       * ```ts
       * { val: "someValue" }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
val: any;
    }
  | {
      /**
       * Addition operation that sums numbers.
       *
       * Accepts a single value (identity) or an array of values to add together.
       *
       * @example
       * ```ts
       * // Identity (single value)
       * { "+": 5 } // Returns 5
       *
       * // Sum array of values
       * { "+": [1, 2, 3] } // Returns 6
       *
       * // With variables
       * { "+": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '+': number | number[] | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Subtraction operation that subtracts numbers.
       *
       * With a single value, negates it. With multiple values, subtracts sequentially.
       *
       * @example
       * ```ts
       * // Negation (single value)
       * { "-": [5] } // Returns -5
       *
       * // Binary subtraction
       * { "-": [10, 3] } // Returns 7
       *
       * // Sequential subtraction
       * { "-": [20, 5, 3] } // Returns 12 (20 - 5 - 3)
       *
       * // With variables
       * { "-": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '-':
        | number
        | [number, number?]
        | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Multiplication operation that multiplies numbers.
       *
       * Accepts an array of values to multiply together.
       * Returns 1 for empty arrays.
       *
       * @example
       * ```ts
       * // Multiply array of values
       * { "*": [2, 3, 4] } // Returns 24
       *
       * // Empty array
       * { "*": [] } // Returns 1
       *
       * // With variables
       * { "*": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '*': number | number[] | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Division operation that divides numbers.
       *
       * Divides sequentially from left to right. With a single value, returns reciprocal.
       *
       * @example
       * ```ts
       * // Reciprocal (single value)
       * { "/": [4] } // Returns 0.25
       *
       * // Binary division
       * { "/": [20, 4] } // Returns 5
       *
       * // Sequential division
       * { "/": [100, 5, 2] } // Returns 10 (100 / 5 / 2)
       *
       * // With variables
       * { "/": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '/':
        | number
        | [number, number]
        | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Modulo operation that calculates remainder after division.
       *
       * Takes two values and returns the remainder of the first divided by the second.
       *
       * @example
       * ```ts
       * // Modulo operation
       * { "%": [10, 3] } // Returns 1
       *
       * // With variables
       * { "%": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '%': [number, number] | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Maximum value operation that finds the largest number in an array.
       *
       * @example
       * ```ts
       * // Find maximum
       * { max: [1, 5, 3, 9, 2] } // Returns 9
       *
       * // With variables
       * { max: [{ var: "numbers" }] }
       * ```
       */
      max: number[] | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Minimum value operation that finds the smallest number in an array.
       *
       * @example
       * ```ts
       * // Find minimum
       * { min: [1, 5, 3, 9, 2] } // Returns 1
       *
       * // With variables
       * { min: [{ var: "numbers" }] }
       * ```
       */
      min: number[] | (number | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Greater than comparison operation.
       *
       * Compares two values and returns true if the first is greater than the second.
       *
       * @example
       * ```ts
       * // Basic comparison
       * { ">": [10, 5] } // Returns true
       *
       * // With variables
       * { ">": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '>': [
        number | string | { var: VarFrom<TVars> & {} },
        number | string | { var: VarFrom<TVars> & {} },
      ];
    }
  | {
      /**
       * Greater than or equal comparison operation.
       *
       * Compares two values and returns true if the first is greater than or equal to the second.
       *
       * @example
       * ```ts
       * // Basic comparison
       * { ">=": [10, 10] } // Returns true
       *
       * // With variables
       * { ">=": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '>=': [
        number | string | { var: VarFrom<TVars> & {} },
        number | string | { var: VarFrom<TVars> & {} },
      ];
    }
  | {
      /**
       * Less than comparison operation.
       *
       * Compares two values and returns true if the first is less than the second.
       *
       * @example
       * ```ts
       * // Basic comparison
       * { "<": [5, 10] } // Returns true
       *
       * // With variables
       * { "<": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '<': [
        number | string | { var: VarFrom<TVars> & {} },
        number | string | { var: VarFrom<TVars> & {} },
      ];
    }
  | {
      /**
       * Less than or equal comparison operation.
       *
       * Compares two values and returns true if the first is less than or equal to the second.
       *
       * @example
       * ```ts
       * // Basic comparison
       * { "<=": [10, 10] } // Returns true
       *
       * // With variables
       * { "<=": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      '<=': [
        number | string | { var: VarFrom<TVars> & {} },
        number | string | { var: VarFrom<TVars> & {} },
      ];
    }
  | {
      /**
       * Loose equality comparison operation.
       *
       * Compares two values using JavaScript's loose equality (==) operator.
       *
       * @example
       * ```ts
       * // Loose equality
       * { "==": [5, "5"] } // Returns true
       *
       * // With variables
       * { "==": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'==': [any, any];
    }
  | {
      /**
       * Strict equality comparison operation.
       *
       * Compares two values using JavaScript's strict equality (===) operator.
       *
       * @example
       * ```ts
       * // Strict equality
       * { "===": [5, 5] } // Returns true
       * { "===": [5, "5"] } // Returns false
       *
       * // With variables
       * { "===": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'===': [any, any];
    }
  | {
      /**
       * Loose inequality comparison operation.
       *
       * Compares two values using JavaScript's loose inequality (!=) operator.
       *
       * @example
       * ```ts
       * // Loose inequality
       * { "!=": [5, "6"] } // Returns true
       * { "!=": [5, "5"] } // Returns false
       *
       * // With variables
       * { "!=": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'!=': [any, any];
    }
  | {
      /**
       * Strict inequality comparison operation.
       *
       * Compares two values using JavaScript's strict inequality (!==) operator.
       *
       * @example
       * ```ts
       * // Strict inequality
       * { "!==": [5, "5"] } // Returns true (different types)
       * { "!==": [5, 5] } // Returns false (same value and type)
       *
       * // With variables
       * { "!==": [{ var: "a" }, { var: "b" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'!==': [any, any];
    }
  | {
      /**
       * Logical AND operation.
       *
       * Returns the first falsy value encountered, or the last value if all are truthy.
       * Short-circuits on the first falsy value.
       *
       * @example
       * ```ts
       * // Basic AND
       * { and: [true, true, true] } // Returns true
       * { and: [true, false, true] } // Returns false
       *
       * // With expressions
       * { and: [
       *   { ">": [{ var: "a" }, 0] },
       *   { "<": [{ var: "b" }, 10] }
       * ]}
       * ```
       */
      and: boolean[] | (boolean | LogicExpr<TVars>)[];
    }
  | {
      /**
       * Logical OR operation.
       *
       * Returns the first truthy value encountered, or the last value if all are falsy.
       * Short-circuits on the first truthy value.
       *
       * @example
       * ```ts
       * // Basic OR
       * { or: [false, false, true] } // Returns true
       * { or: [false, false, false] } // Returns false
       *
       * // With expressions
       * { or: [
       *   { ">": [{ var: "a" }, 10] },
       *   { "<": [{ var: "b" }, 5] }
       * ]}
       * ```
       */
      or: boolean[] | (boolean | LogicExpr<TVars>)[];
    }
  | {
      /**
       * Logical NOT operation.
       *
       * Returns the negation of the input value using the engine's truthiness rules.
       *
       * @example
       * ```ts
       * // Basic NOT
       * { not: true } // Returns false
       * { not: false } // Returns true
       * { not: 0 } // Returns true
       * { not: 1 } // Returns false
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
not: any;
    }
  | {
      /**
       * Alternative logical NOT operation using '!' symbol.
       *
       * Same as 'not' operation but with shorter syntax.
       *
       * @example
       * ```ts
       * // Basic NOT
       * { "!": true } // Returns false
       * { "!": false } // Returns true
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'!': any;
    }
  | {
      /**
       * Double logical NOT operation for converting to boolean.
       *
       * Converts any value to its boolean equivalent.
       *
       * @example
       * ```ts
       * // Convert to boolean
       * { "!!": 5 } // Returns true
       * { "!!": 0 } // Returns false
       * { "!!": "hello" } // Returns true
       * { "!!": "" } // Returns false
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'!!': any;
    }
  | {
      /**
       * Nullish coalescing operation.
       *
       * Returns the first value if it's not null or undefined, otherwise returns the second value.
       *
       * @example
       * ```ts
       * // Nullish coalescing
       * { "??": [null, "default"] } // Returns "default"
       * { "??": [undefined, "default"] } // Returns "default"
       * { "??": ["actual", "default"] } // Returns "actual"
       * { "??": [0, "default"] } // Returns 0 (zero is not nullish)
       * { "??": [false, "default"] } // Returns false (false is not nullish)
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'??': [any, any];
    }
  | {
      /**
       * Conditional IF operation.
       *
       * Evaluates conditions in order until one is truthy, then returns the corresponding result.
       * Can take pairs of [condition, result] followed by an optional default value.
       *
       * @example
       * ```ts
       * // Simple if-else
       * { if: [
       *   { ">": [{ var: "age" }, 18] },
       *   "adult",
       *   "minor"
       * ]}
       *
       * // Multiple conditions
       * { if: [
       *   { "<": [{ var: "score" }, 50] }, "F",
       *   { "<": [{ var: "score" }, 65] }, "D",
       *   { "<": [{ var: "score" }, 80] }, "C",
       *   { "<": [{ var: "score" }, 90] }, "B",
       *   "A"
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
if: [boolean, any, any] | any[];
    }
  | {
      /**
       * Ternary conditional operation (shorthand for if-else).
       *
       * Equivalent to the if operation but with a more compact syntax.
       *
       * @example
       * ```ts
       * // Basic ternary
       * { "?:": [true, "yes", "no"] } // Returns "yes"
       * { "?:": [false, "yes", "no"] } // Returns "no"
       *
       * // With comparisons
       * { "?:": [
       *   { ">": [{ var: "age" }, 18] },
       *   "adult",
       *   "minor"
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
'?:': [boolean, any, any] | any[];
    }
  | {
      /**
       * String concatenation operation.
       *
       * Joins multiple strings or string representations of values into a single string.
       *
       * @example
       * ```ts
       * // Basic concatenation
       * { cat: ["Hello", " ", "World"] } // Returns "Hello World"
       *
       * // With variables
       * { cat: ["User: ", { var: "name" }] }
       * ```
       */
      cat: string | string[] | (string | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Substring extraction operation.
       *
       * Extracts characters from a string starting at a given position for a given length.
       *
       * @example
       * ```ts
       * // Basic substring
       * { substr: ["Hello World", 0, 5] } // Returns "Hello"
       *
       * // With variables
       * { substr: [{ var: "text" }, 0, 3] }
       * ```
       */
      substr: [string | { var: VarFrom<TVars> & {} }, number, number];
    }
  | {
      /**
       * Length operation that gets the length of a string, array, or object.
       *
       * @example
       * ```ts
       * // String length
       * { length: "Hello" } // Returns 5
       *
       * // Array length
       * { length: [1, 2, 3, 4] } // Returns 4
       *
       * // Object keys count
       * { length: { a: 1, b: 2, c: 3 } } // Returns 3
       *
       * // With variables
       * { length: { var: "collection" } }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
length: string | any[] | { var: VarFrom<TVars> & {} };
    }
  | {
      /**
       * Merge operation that combines arrays.
       *
       * Merges multiple arrays into a single array.
       *
       * @example
       * ```ts
       * // Basic merge
       * { merge: [[1, 2], [3, 4]] } // Returns [1, 2, 3, 4]
       *
       * // With variables
       * { merge: [{ var: "array1" }, { var: "array2" }] }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
merge: any[] | (any[] | { var: VarFrom<TVars> & {} })[];
    }
  | {
      /**
       * Map operation that transforms each element in an array.
       *
       * Similar to JavaScript's Array.map(), applies the given expression to each
       * element and returns a new array with transformed values.
       *
       * @example
       * ```ts
       * // Transform numbers
       * { map: [
       *   [1, 2, 3, 4],
       *   { "+": [{ var: "current" }, 10] }
       * ]} // Returns [11, 12, 13, 14]
       *
       * // With variables
       * { map: [
       *   { var: "numbers" },
       *   { "*": [{ var: "current" }, 2] }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
map: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * Filter operation that filters an array based on a condition.
       *
       * Similar to JavaScript's Array.filter(), keeps only elements for which
       * the expression evaluates to a truthy value.
       *
       * @example
       * ```ts
       * // Filter numbers
       * { filter: [
       *   [1, 2, 3, 4, 5, 6],
       *   { ">": [{ var: "current" }, 3] }
       * ]} // Returns [4, 5, 6]
       *
       * // With variables
       * { filter: [
       *   { var: "numbers" },
       *   { "==": [{ var: "current" }, 5] }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
filter: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * Reduce operation that reduces an array to a single value.
       *
       * Similar to JavaScript's Array.reduce(), applies the expression cumulatively
       * to the items of the array, from left to right, so as to reduce the array to a single value.
       *
       * @example
       * ```ts
       * // Sum all numbers
       * { reduce: [
       *   [1, 2, 3, 4],
       *   { "+": [{ var: "accumulator" }, { var: "current" }] },
       *   0
       * ]} // Returns 10
       *
       * // With variables
       * { reduce: [
       *   { var: "numbers" },
       *   { "+": [{ var: "accumulator" }, { var: "current" }] },
       *   { var: "initialValue" }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
reduce: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>, any];
    }
  | {
      /**
       * All operation that checks if all elements in an array satisfy a condition.
       *
       * Returns true if all elements satisfy the condition, false otherwise.
       *
       * @example
       * ```ts
       * // Check if all numbers are positive
       * { all: [
       *   [1, 2, 3, 4],
       *   { ">": [{ var: "current" }, 0] }
       * ]} // Returns true
       *
       * // With variables
       * { all: [
       *   { var: "items" },
       *   { ">": [{ var: "current.price" }, 0] }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
all: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * Every operation that checks if all elements in an array satisfy a condition.
       *
       * Alias for 'all' operation, returns true if all elements satisfy the condition, false otherwise.
       *
       * @example
       * ```ts
       * // Check if every number is positive
       * { every: [
       *   [1, 2, 3, 4],
       *   { ">": [{ var: "current" }, 0] }
       * ]} // Returns true
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
every: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * Some operation that checks if any element in an array satisfies a condition.
       *
       * Returns true if at least one element satisfies the condition, false otherwise.
       *
       * @example
       * ```ts
       * // Check if any number is negative
       * { some: [
       *   [1, 2, -3, 4],
       *   { "<": [{ var: "current" }, 0] }
       * ]} // Returns true
       *
       * // With variables
       * { some: [
       *   { var: "items" },
       *   { ">": [{ var: "current.price" }, 100] }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
some: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * None operation that checks if no elements in an array satisfy a condition.
       *
       * Returns true if no elements satisfy the condition, false otherwise.
       *
       * @example
       * ```ts
       * // Check if no number is negative
       * { none: [
       *   [1, 2, 3, 4],
       *   { "<": [{ var: "current" }, 0] }
       * ]} // Returns true
       *
       * // With variables
       * { none: [
       *   { var: "items" },
       *   { "<": [{ var: "current.price" }, 0] }
       * ]}
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
none: [any[] | { var: VarFrom<TVars> & {} }, LogicExpr<TVars>];
    }
  | {
      /**
       * Get operation that retrieves a value from an object using a key.
       *
       * Safely retrieves a property from an object, with optional default value.
       *
       * @example
       * ```ts
       * // Basic get
       * { get: [{ var: "obj" }, "property"] }
       *
       * // With default value
       * { get: [{ var: "obj" }, "property", "default"] }
       * ```
       */
      get: [
        object | { var: VarFrom<TVars> & {} },
        string | number | { var: VarFrom<TVars> & {} },
      ];
    }
  | {
      /**
       * Keys operation that gets the keys of an object.
       *
       * Returns an array of the enumerable property names of the object.
       *
       * @example
       * ```ts
       * // Get keys of an object
       * { keys: { var: "obj" } } // Returns array of keys
       * ```
       */
      keys: object | { var: VarFrom<TVars> & {} };
    }
  | {
      /**
       * EachKey operation that applies different logic based on object keys.
       *
       * Allows defining different expressions for different keys of an object.
       *
       * @example
       * ```ts
       * // Apply different logic based on keys
       * { eachKey: {
       *   name: { cat: ["Hello, ", { var: "current" }] },
       *   age: { "+": [{ var: "current" }, 1] }
       * }}
       * ```
       */
      eachKey: { [key: string]: LogicExpr<TVars> };
    }
  | {
      /**
       * Exists operation that checks if a variable exists in the context.
       *
       * Returns true if the variable exists (even if falsy), false otherwise.
       *
       * @example
       * ```ts
       * // Check if variable exists
       * { exists: "propertyName" }
       *
       * // With variable reference
       * { exists: { var: "dynamicPropertyName" } }
       * ```
       */
      exists: (VarFrom<TVars> & {}) | { var: VarFrom<TVars> & {} };
    }
  | {
      /**
       * Preserve operation that preserves the original value.
       *
       * Returns the value unchanged, often used to prevent certain optimizations.
       *
       * @example
       * ```ts
       * // Preserve original value
       * { preserve: { var: "value" } }
       * ```
       */
      
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
preserve: any;
    }
  | {
      /**
       * Throw operation that throws an error.
       *
       * Throws an error with the specified message or object.
       *
       * @example
       * ```ts
       * // Throw an error
       * { throw: "Something went wrong!" }
       *
       * // Throw with object
       * { throw: { message: "Custom error", code: 500 } }
       * ```
       */
      throw: string | object;
    }
  | {
      /**
       * Dynamic operation that allows any custom operation.
       *
       * Provides flexibility for custom operations not covered by the predefined types.
       * The key is the operation name, value can be any valid LogicExpr or primitive.
       *
       * @example
       * ```ts
       * // Custom operation
       * { customOp: { var: "value" } }
       *
       * // Nested expressions
       * { myCustomLogic: { "+": [1, 2, 3] } }
       * ```
       */
      [key: string]: LogicExpr<TVars> | Primitive;
    };

/**
 * Configuration options for the LogicEngine.
 *
 * These options control various aspects of engine behavior including
 * performance optimizations, security settings, and functional capabilities.
 */
export interface EngineOptions {
  /**
   * Disables inline optimizations that might substitute values directly.
   * When true, prevents certain performance optimizations for debugging.
   * @default false
   */
  disableInline?: boolean;

  /**
   * Disables interpreted optimizations that cache execution plans.
   * When true, prevents caching of optimized execution functions.
   * @default false
   */
  disableInterpretedOptimization?: boolean;

  /**
   * Enables permissive mode that treats unknown properties as data.
   * When true, allows access to properties not explicitly defined as methods.
   * @default false
   */
  permissive?: boolean;

  /**
   * Maximum depth allowed for nested operations to prevent infinite loops.
   * Set to 0 for unlimited depth (use with caution).
   * @default 0 (unlimited)
   */
  maxDepth?: number;

  /**
   * Maximum allowed length for arrays processed by the engine.
   * Helps prevent memory exhaustion from extremely large arrays.
   * @default 32768 (2^15)
   */
  maxArrayLength?: number;

  /**
   * Maximum allowed length for strings processed by the engine.
   * Helps prevent memory exhaustion from extremely long strings.
   * @default 65536 (2^16)
   */
  maxStringLength?: number;

  /**
   * Allows functions to be passed and called in JSON expressions.
   * When true, enables the 'call' and 'fn' operations for function support.
   * @default false
   */
  allowFunctions?: boolean; // New: Allow functions in expressions
}

/**
 * Definition structure for custom engine methods.
 *
 * This interface defines how custom operations can be registered with the engine,
 * including support for lazy evaluation, determinism hints, and asynchronous operations.
 *
 * @template TArgs - Type of the arguments passed to the method
 * @template TContext - Type of the data context
 * @template TAbove - Type of the parent context stack
 * @template TEngine - Type of the engine instance
 */
export interface MethodDefinition<
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TArgs = any,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TContext = any,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TAbove = any,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  TEngine = any,
> {
  /**
   * The core method implementation that performs the operation.
   *
   * @param args - Arguments passed to the method from the JSON expression
   * @param context - Current data context for variable access
   * @param above - Stack of parent contexts for upward navigation
   * @param engine - Reference to the engine instance
   * @returns The result of the operation
   */
  method: (
    args: TArgs,
    context: TContext,
    above: TAbove[],
    engine: TEngine,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  ) => any;

  /**
   * Indicates whether the method should be evaluated lazily.
   * When true, arguments are not pre-evaluated and passed as-is.
   * @default false
   */
  lazy?: boolean;

  /**
   * Indicates whether the method should traverse nested structures.
   * Used for optimization decisions in the engine.
   * @default false
   */
  traverse?: boolean;

  /**
   * Indicates whether the method produces deterministic results.
   * Can be a boolean or a function that determines determinism based on input.
   * Used for optimization purposes.
   */
  
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
deterministic?: boolean | ((data: any, buildState: any) => boolean);

  /**
   * Asynchronous version of the method for async operations.
   *
   * @param args - Arguments passed to the method from the JSON expression
   * @param context - Current data context for variable access
   * @param above - Stack of parent contexts for upward navigation
   * @param engine - Reference to the engine instance
   * @returns A promise resolving to the result of the operation
   */
  asyncMethod?: (
    args: TArgs,
    context: TContext,
    above: TAbove[],
    engine: TEngine,
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  ) => Promise<any>;
}
