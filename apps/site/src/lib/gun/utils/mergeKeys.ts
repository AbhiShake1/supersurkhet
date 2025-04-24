export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
	return key.split(".").concat(restKeys).join(".");
}
