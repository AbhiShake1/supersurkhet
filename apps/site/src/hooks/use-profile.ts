import { useGet } from "@gta/react-hooks";
import { useRouteContext } from "@tanstack/react-router";

export function useProfile() {
	const { auth } = useRouteContext({ from: "__root__" });
	const user = auth.getCurrentUser();
	const [profile] = useGet("user", user?.pub);
	if (!user) return null
	return profile;
}
