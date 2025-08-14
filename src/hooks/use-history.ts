"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { getHistory } from "@/controllers/requests";
import { HistoryItem, WorkflowResponse } from "@/types";
import { useWallet } from "./use-wallet";

export const useHistory = (limit: number = 5) => {
	const { skyBrowser, address } = useWallet();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	// Cache to prevent unnecessary API calls
	const lastFetchRef = useRef<number>(0);
	const lastDataHashRef = useRef<string>("");
	const isFetchingRef = useRef<boolean>(false);

	// Debounce rapid calls
	const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Create a hash of the data to detect changes
	const createDataHash = useCallback((data: HistoryItem[]): string => {
		return JSON.stringify(
			data.map((item) => ({
				id: item.id,
				requestId: item.requestId,
				status: item.status,
				updatedAt: item.updatedAt,
			}))
		);
	}, []);

	const fetchHistory = useCallback(
		async (newLimit?: number) => {
			const currentLimit = newLimit || limit;
			const now = Date.now();

			// Prevent rapid successive calls (within 2 seconds)
			if (now - lastFetchRef.current < 2000) {
				console.log("⏱️ Skipping fetch - too recent");
				return;
			}

			// Prevent concurrent fetches
			if (isFetchingRef.current) {
				console.log("⏱️ Skipping fetch - already in progress");
				return;
			}

			console.log("fetchHistory called with:", {
				skyBrowser: !!skyBrowser,
				address,
				limit: currentLimit,
				timeSinceLastFetch: now - lastFetchRef.current,
			});

			if (!skyBrowser || !address) {
				console.log("No skyBrowser or address, setting empty history");
				setHistory([]);
				setIsInitialLoad(false);
				return;
			}

			try {
				isFetchingRef.current = true;

				// Only show loading if it's the initial load or if we have existing data
				// This prevents showing loader on every auto-refresh when data hasn't changed
				if (isInitialLoad || history.length === 0) {
					setLoading(true);
				}

				setError(null);

				const web3Context = { address };
				const response = await getHistory(
					{
						page: 1,
						limit: currentLimit,
					},
					skyBrowser,
					web3Context
				);

				console.log("API Response:", response);

				let newHistory: HistoryItem[] = [];

				// Handle the new workflow response format
				if (response.workflows && Array.isArray(response.workflows)) {
					newHistory = response.workflows;
				} else if (response.success && response.data?.requests) {
					// Fallback to old format if needed
					newHistory = response.data.requests;
				}

				// Check if data has actually changed
				const newDataHash = createDataHash(newHistory);
				if (
					newDataHash === lastDataHashRef.current &&
					history.length > 0
				) {
					console.log("🔄 Data unchanged, skipping update");
					// Don't show loading since no change occurred
					return;
				}

				// Update state and cache
				setHistory(newHistory);
				lastDataHashRef.current = newDataHash;
				lastFetchRef.current = now;
				setIsInitialLoad(false);

				console.log("✅ History updated successfully");
			} catch (err) {
				console.error("Failed to fetch history:", err);
				setError(
					err instanceof Error
						? err.message
						: "Failed to fetch history"
				);
				setIsInitialLoad(false);
				// Don't clear history on error to maintain UI consistency
			} finally {
				setLoading(false);
				isFetchingRef.current = false;
			}
		},
		[
			skyBrowser,
			address,
			limit,
			createDataHash,
			history.length,
			isInitialLoad,
		]
	);

	// Debounced fetch for rapid calls
	const debouncedFetchHistory = useCallback(
		(newLimit?: number) => {
			if (fetchTimeoutRef.current) {
				clearTimeout(fetchTimeoutRef.current);
			}

			fetchTimeoutRef.current = setTimeout(() => {
				fetchHistory(newLimit);
			}, 300);
		},
		[fetchHistory]
	);

	useEffect(() => {
		// Initial fetch
		fetchHistory();

		// Cleanup timeout on unmount
		return () => {
			if (fetchTimeoutRef.current) {
				clearTimeout(fetchTimeoutRef.current);
			}
		};
	}, [skyBrowser, address, limit]);

	const refreshHistory = useCallback(() => {
		// Force refresh by clearing cache
		lastFetchRef.current = 0;
		lastDataHashRef.current = "";
		setIsInitialLoad(true);
		fetchHistory();
	}, [fetchHistory]);

	return {
		history,
		loading,
		error,
		refreshHistory,
		fetchHistory: debouncedFetchHistory,
	};
};
