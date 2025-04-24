import * as React from "react";

import { useCallbackRef } from "@/hooks/use-callback-ref";

export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
	callback: T,
	delay: number,
) {
	const handleCallback = useCallbackRef(callback);
	const debounceTimerRef = React.useRef(0);
	React.useEffect(
		() => () => window.clearTimeout(debounceTimerRef.current),
		[],
	);

	const setValue = (...args: Parameters<T>) => {
		window.clearTimeout(debounceTimerRef.current);
		debounceTimerRef.current = window.setTimeout(
			() => handleCallback(...args),
			delay,
		);
	};

	return setValue;
}
