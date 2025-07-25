import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function recordToList<R extends Record<string, any>>(record: R) {
	return Object.entries(record).filter(([, v]) => typeof v !== "string").map(([soul, v]) => ({ ...v, _: { ...v._, soul } })) as Array<R[string] & { _: { soul: string } }>
}
