"use client";
import { useState, useEffect } from "react";
import { getHistory } from "@/controllers/requests";
import { HistoryItem, WorkflowResponse } from "@/types";
import { useWallet } from "./use-wallet";

export const useHistory = (limit: number = 5) => {
	const { skyBrowser, address } = useWallet();
	const [history, setHistory] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchHistory = async (newLimit?: number) => {
		console.log("fetchHistory called with:", {
			skyBrowser: !!skyBrowser,
			address,
			limit: newLimit || limit,
		}); // Debug log

		if (!skyBrowser || !address) {
			console.log("No skyBrowser or address, setting empty history"); // Debug log
			setHistory([]);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const web3Context = { address };
			const response = await getHistory(
				{
					page: 1,
					limit: newLimit || limit,
				},
				skyBrowser,
				web3Context
			);

			console.log("API Response:", response); // Debug log

			// Handle the new workflow response format
			if (response.workflows && Array.isArray(response.workflows)) {
				console.log("Setting workflows:", response.workflows); // Debug log
				setHistory(response.workflows);
			} else if (response.success && response.data?.requests) {
				// Fallback to old format if needed
				console.log("Setting requests:", response.data.requests); // Debug log
				setHistory(response.data.requests);
			} else {
				console.log("No valid data found in response"); // Debug log
				setHistory([]);
			}
		} catch (err) {
			console.error("Failed to fetch history:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch history"
			);
			setHistory([]);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchHistory();
	}, [skyBrowser, address, limit]);

	const refreshHistory = () => {
		fetchHistory();
	};

	return {
		history,
		loading,
		error,
		refreshHistory,
		fetchHistory,
	};
};
