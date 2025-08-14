import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export interface CachedSubnetData {
	itemID: number;
	toolName: string;
	status: "pending" | "in_progress" | "done" | "failed" | "waiting_response";
	data: any;
	prompt: string | null;
	question?: {
		type: string;
		text: string;
		itemID: number;
		expiresAt: string;
	};
	contentHash: string;
	timestamp: number;
	workflowId: string;
}

interface SubnetCacheStoreState {
	// Cache for each workflow: workflowId -> subnetIndex -> CachedSubnetData
	subnetCache: Map<string, Map<number, CachedSubnetData>>;

	// Actions
	cacheSubnetData: (
		workflowId: string,
		subnetIndex: number,
		subnetData: any
	) => void;
	getCachedSubnetData: (
		workflowId: string,
		subnetIndex: number
	) => CachedSubnetData | undefined;
	getWorkflowSubnets: (
		workflowId: string
	) => Map<number, CachedSubnetData> | undefined;
	clearWorkflowCache: (workflowId: string) => void;
	clearAllCache: () => void;
	hasSubnetChanged: (
		workflowId: string,
		subnetIndex: number,
		newData: any
	) => boolean;
	updateSubnetStatus: (
		workflowId: string,
		subnetIndex: number,
		status: string,
		data?: any
	) => void;
	// Debug function to clear all tracking
	clearAllTracking: () => void;
}

export const useSubnetCacheStore = create<SubnetCacheStoreState>()(
	subscribeWithSelector((set, get) => ({
		subnetCache: new Map(),

		cacheSubnetData: (
			workflowId: string,
			subnetIndex: number,
			subnetData: any
		) => {
			console.log(
				`🔒 Caching subnet data for workflow ${workflowId}, subnet ${subnetIndex}:`,
				subnetData
			);

			set((state) => {
				const newCache = new Map(state.subnetCache);
				const workflowCache = newCache.get(workflowId) || new Map();

				// Create content hash for change detection
				const contentHash = JSON.stringify({
					status: subnetData.status,
					data: subnetData.data,
					prompt: subnetData.prompt,
					question: subnetData.question,
				});

				const cachedData: CachedSubnetData = {
					itemID: subnetData.itemID,
					toolName: subnetData.toolName,
					status: subnetData.status,
					data: subnetData.data,
					prompt: subnetData.prompt,
					question: subnetData.question,
					contentHash,
					timestamp: Date.now(),
					workflowId,
				};

				workflowCache.set(subnetIndex, cachedData);
				newCache.set(workflowId, workflowCache);

				console.log(
					`✅ Subnet cached successfully. Total workflows: ${newCache.size}, Subnets in workflow ${workflowId}: ${workflowCache.size}`
				);
				return { subnetCache: newCache };
			});
		},

		getCachedSubnetData: (workflowId: string, subnetIndex: number) => {
			const state = get();
			const cached = state.subnetCache.get(workflowId)?.get(subnetIndex);
			console.log(
				`🔍 Getting cached subnet data for workflow ${workflowId}, subnet ${subnetIndex}:`,
				cached ? "Found" : "Not found"
			);
			return cached;
		},

		getWorkflowSubnets: (workflowId: string) => {
			const state = get();
			const subnets = state.subnetCache.get(workflowId);
			console.log(
				`🔍 Getting workflow subnets for ${workflowId}:`,
				subnets ? `${subnets.size} subnets` : "No subnets found"
			);
			return subnets;
		},

		clearWorkflowCache: (workflowId: string) => {
			console.log(`🗑️ Clearing cache for workflow ${workflowId}`);
			set((state) => {
				const newCache = new Map(state.subnetCache);
				const deleted = newCache.delete(workflowId);
				console.log(
					`✅ Workflow cache cleared: ${
						deleted ? "Success" : "Not found"
					}`
				);
				return { subnetCache: newCache };
			});
		},

		clearAllCache: () => {
			console.log(`🗑️ Clearing all subnet cache`);
			set({ subnetCache: new Map() });
		},
		// Debug function to clear all tracking
		clearAllTracking: () => {
			console.log(`🗑️ Clearing all tracking data`);
			set({ subnetCache: new Map() });
		},

		hasSubnetChanged: (
			workflowId: string,
			subnetIndex: number,
			newData: any
		) => {
			const state = get();
			const cached = state.subnetCache.get(workflowId)?.get(subnetIndex);

			if (!cached) {
				console.log(
					`🆕 Subnet ${subnetIndex} in workflow ${workflowId} is new (no cache)`
				);
				return true; // New subnet, consider it changed
			}

			// Create hash for new data
			const newContentHash = JSON.stringify({
				status: newData.status,
				data: newData.data,
				prompt: newData.prompt,
				question: newData.question,
			});

			const hasChanged = cached.contentHash !== newContentHash;
			console.log(
				`🔄 Subnet ${subnetIndex} in workflow ${workflowId} changed: ${
					hasChanged ? "Yes" : "No"
				}`
			);

			if (hasChanged) {
				console.log(`📊 Change details:`, {
					oldHash: cached.contentHash,
					newHash: newContentHash,
					oldStatus: cached.status,
					newStatus: newData.status,
				});
			}

			return hasChanged;
		},

		updateSubnetStatus: (
			workflowId: string,
			subnetIndex: number,
			status: string,
			data?: any
		) => {
			console.log(
				`🔄 Updating subnet status for workflow ${workflowId}, subnet ${subnetIndex} to ${status}`
			);

			set((state) => {
				const newCache = new Map(state.subnetCache);
				const workflowCache = newCache.get(workflowId);

				if (workflowCache) {
					const existing = workflowCache.get(subnetIndex);
					if (existing) {
						const updated: CachedSubnetData = {
							...existing,
							status: status as any,
							data: data || existing.data,
							timestamp: Date.now(),
						};

						// Update content hash
						updated.contentHash = JSON.stringify({
							status: updated.status,
							data: updated.data,
							prompt: updated.prompt,
							question: updated.question,
						});

						workflowCache.set(subnetIndex, updated);
						console.log(`✅ Subnet status updated successfully`);
					} else {
						console.log(
							`⚠️ Subnet ${subnetIndex} not found in workflow ${workflowId} for status update`
						);
					}
				} else {
					console.log(
						`⚠️ Workflow ${workflowId} not found for status update`
					);
				}

				return { subnetCache: newCache };
			});
		},
	}))
);
