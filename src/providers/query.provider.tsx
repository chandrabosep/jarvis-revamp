"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

const QueryProviderWrapper = ({ children }: { children: React.ReactNode }) => {
	const [client] = useState(
		new QueryClient({
			defaultOptions: {
				queries: {
					refetchOnWindowFocus: false,
					refetchOnMount: false,
					refetchOnReconnect: false,
					gcTime: 1000 * 60 * 60 * 24,
					staleTime: 1000 * 60 * 5,
				},
				mutations: {
					retry: 1,
				},
			},
		})
	);
	return (
		<QueryClientProvider client={client}>
			{children}
			<ReactQueryDevtools />
		</QueryClientProvider>
	);
};

export default QueryProviderWrapper;
