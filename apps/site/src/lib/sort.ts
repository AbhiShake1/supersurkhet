import type { SortingItemSchema } from './parsers';

export function applySorting<TData>(
  data: TData[],
  sorting: SortingItemSchema[],
): TData[] {
  // If no sorting is applied, return the original data array.
  if (sorting.length === 0) {
    return data;
  }

  // A comparator function that handles different data types robustly.
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const compareValues = (a: any, b: any): number => {
    // Place null or undefined values at the end of the sorted list.
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;

    // Compare booleans.
    if (typeof a === 'boolean' && typeof b === 'boolean') {
      return a === b ? 0 : a ? -1 : 1;
    }

    // Compare numbers directly.
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Compare dates by their timestamp.
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // For other types (including string), convert to string and compare.
    // This ensures consistent sorting for mixed types.
    return String(a).localeCompare(String(b));
  };

  // Create a shallow copy of the data to avoid mutating the original array.
  const sortedData = [...data];

  sortedData.sort((a, b) => {
    for (const sort of sorting) {
      const aValue = a[sort.id as keyof TData];
      const bValue = b[sort.id as keyof TData];

      const result = compareValues(aValue, bValue);

      // If the values are not equal, return the result based on the sort direction.
      if (result !== 0) {
        return sort.desc ? -result : result;
      }
    }

    // If all sorting criteria result in equality, maintain the original order.
    return 0;
  });

  return sortedData;
}
