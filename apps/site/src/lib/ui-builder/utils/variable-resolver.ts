/**
 * Resolves contextual mentions in a string (e.g., @user.name, @business.name)
 * @param value - The string value that may contain contextual mentions
 * @param contextData - Contextual data like user info, business info, etc.
 * @returns String with contextual mentions resolved
 */
export function resolveContextualMentions(
  value: string,
  contextData: Record<string, any>,
): string {
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
