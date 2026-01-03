import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { I18nProvider } from "@/contexts/i18n-context";

const queryClient = new QueryClient();

export function getContext() {
	return {
		queryClient,
	};
}

export function Provider({ children }: { children: React.ReactNode }) {
	return (
		<QueryClientProvider client={queryClient}>
			<I18nProvider>
				{children}
			</I18nProvider>
		</QueryClientProvider>
	);
}