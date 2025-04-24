import type { UseGunOptions } from "./hooks/useGunHook";

let defaultGunHookOptions: Partial<UseGunOptions> = {};

export function mergeOptionsWithDefaults(options: Partial<UseGunOptions>) {
	return { ...defaultGunHookOptions, ...options };
}

export function setGTADefaultOptions(options: UseGunOptions) {
	defaultGunHookOptions = options;
}
