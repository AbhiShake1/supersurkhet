import React from 'react';
import { type Variable, type PropValue, isVariableReference } from '@/components/ui/ui-builder/types';

/**
 * Resolves variable references in props using provided variable values
 * @param props - The props object that may contain variable references
 * @param variables - Array of available variables
 * @param variableValues - Object mapping variable IDs to their resolved values
 * @param contextData - Contextual data like user info, business info, etc.
 * @returns Props with variable references resolved
 */
export function resolveVariableReferences(
  props: Record<string, PropValue>,
  variables: Variable[],
  variableValues?: Record<string, PropValue>,
  contextData?: Record<string, any>
): Record<string, PropValue> {
  const resolved: Record<string, PropValue> = {};

  for (const [key, value] of Object.entries(props)) {
    if (isVariableReference(value)) {
      const variable = variables.find(v => v.id === value.__variableRef);
      if (variable) {
        // Use provided value or fall back to default value
        resolved[key] = variableValues?.[variable.id] ?? variable.defaultValue;
      } else {
        // Variable not found, use default value or undefined
        resolved[key] = undefined;
      }
    } else if (typeof value === 'string' && contextData) {
      // Handle contextual mentions in strings (e.g., @user.name, @business.name)
      resolved[key] = resolveContextualMentions(value as string, contextData);
    } else if (Array.isArray(value) && contextData) {
      // Process arrays, looking for strings that might contain mentions
      resolved[key] = value.map(item => {
        if (typeof item === 'string') {
          return resolveContextualMentions(item, contextData);
        } else if (typeof item === 'object' && item !== null && !React.isValidElement(item)) {
          // Recursively resolve nested objects within arrays
          return resolveVariableReferences(item as Record<string, PropValue>, variables, variableValues, contextData);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !React.isValidElement(value)) {
      // Recursively resolve nested objects (but not React elements or arrays)
      resolved[key] = resolveVariableReferences(value as Record<string, PropValue>, variables, variableValues, contextData);
    } else {
      // Regular value, keep as is
      resolved[key] = value;
    }
  }

  return resolved;
}

/**
 * Resolves contextual mentions in a string (e.g., @user.name, @business.name)
 * @param value - The string value that may contain contextual mentions
 * @param contextData - Contextual data like user info, business info, etc.
 * @returns String with contextual mentions resolved
 */
export function resolveContextualMentions(value: string, contextData: Record<string, any>): string {
  if (!contextData) {
    return value;
  }

  // Match @ followed by any word characters and dots (e.g., @user.name, @business.id, @user.address.lat)
  const mentionRegex = /@([a-zA-Z0-9_.]+)/g;

  return value.replace(mentionRegex, (match, path) => {
    try {
      // Split the path and navigate the contextData object using a more robust method
      const parts = path.split('.');

      // Use a safe navigation function to access nested properties
      let result: any = contextData;
      for (const part of parts) {
        // Check if result is null or undefined before accessing properties
        if (result == null) {
          return match;
        }

        // Check if result is an object (including arrays) that has the property
        if (typeof result === 'object' && part in result) {
          result = result[part];
        } else {
          // If path doesn't exist, return the original mention
          return match;
        }
      }

      // Return the resolved value as string, handling null/undefined values
      return result != null ? String(result) : match;
    } catch (e) {
      console.error('resolveContextualMentions: Error resolving mention:', e);
      // If there's an error resolving the mention, return the original
      return match;
    }
  });
}

// Export the isVariableReference function for backward compatibility
export { isVariableReference };
