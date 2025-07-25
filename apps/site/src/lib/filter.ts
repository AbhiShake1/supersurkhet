
import { type FilterItemSchema } from "@/lib/parsers";

export function applyFilters<TData>(
	data: TData[],
	filters: FilterItemSchema[],
): TData[] {
	if (filters.length === 0) {
		return data;
	}

	return data.filter((row) => {
		return filters.every((filter) => {
			const rowValue = row[filter.id as keyof TData];
			const filterValue = filter.value;

			switch (filter.operator) {
				case "iLike":
					return String(rowValue)
						.toLowerCase()
						.includes(String(filterValue).toLowerCase());
				case "notILike":
					return !String(rowValue)
						.toLowerCase()
						.includes(String(filterValue).toLowerCase());
				case "eq":
					return String(rowValue) === String(filterValue);
				case "ne":
					return String(rowValue) !== String(filterValue);
				case "gt":
					return rowValue > filterValue;
				case "gte":
					return rowValue >= filterValue;
				case "lt":
					return rowValue < filterValue;
				case "lte":
					return rowValue <= filterValue;
				case "inArray":
					return (filterValue as string[]).includes(String(rowValue));
				case "notInArray":
					return !(filterValue as string[]).includes(String(rowValue));
				case "isBetween": {
					const [min, max] = filterValue as [string, string];
					return rowValue >= min && rowValue <= max;
				}
				case "isEmpty":
					return rowValue === "" || rowValue === null || rowValue === undefined;
				case "isNotEmpty":
					return rowValue !== "" && rowValue !== null && rowValue !== undefined;
				default:
					return true;
			}
		});
	});
}
