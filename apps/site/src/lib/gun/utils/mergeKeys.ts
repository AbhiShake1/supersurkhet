export function mergeKeys<T extends string>(key: T, ...restKeys: string[]) {
	const initialKeys = key?.length ? key.split(".") : [];
	return initialKeys.concat(restKeys).join(".");
}
