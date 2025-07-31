import axios from "axios";
import { getAuthWithRetry, ensureUserHasNFT } from "@/utils/skynetHelper";

// Status of a workflow execution
export interface WorkflowStatus {
	requestId: string;
	workflowStatus: "pending" | "in_progress" | "completed" | "failed";
	currentSubnet?: string;
	completedSubnets?: string[];
	totalSubnets?: number;
	progress?: number;
	result?: any;
	error?: string;
	timestamp?: string;
}

// Status of individual subnets in the workflow
export interface SubnetStatus {
	subnetId: string;
	subnetName: string;
	status: "pending" | "starting" | "processing" | "completed" | "failed";
	result?: any;
	error?: string;
	startTime?: string;
	endTime?: string;
}

/**
 * Redis-Agent Service
 *
 * This service handles workflow status monitoring on the Skynet network.
 * It's responsible for:
 * - Checking workflow execution status
 * - Polling for status updates
 * - Managing polling intervals
 * - Providing real-time status updates
 */
export class RedisAgentService {
	private static instance: RedisAgentService;
	private baseURL: string;
	private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

	private constructor() {
		// Use environment variable for Redis-Agent service URL
		this.baseURL = process.env.NEXT_PUBLIC_REDIS_USER_AGENT_URL || "";

		if (!this.baseURL) {
			console.warn("NEXT_PUBLIC_REDIS_USER_AGENT_URL not configured");
		}
	}

	// Singleton pattern - ensures only one instance exists
	static getInstance(): RedisAgentService {
		if (!RedisAgentService.instance) {
			RedisAgentService.instance = new RedisAgentService();
		}
		return RedisAgentService.instance;
	}

	/**
	 * Generate API key for requests
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @returns Promise with API key
	 */
	private async generateApiKey(
		skyBrowser: any,
		web3Context: any
	): Promise<string> {
		try {
			console.log("🔑 Generating API key...");

			// Get user authentication
			const auth = await getAuthWithRetry(skyBrowser);

			if (!auth.success) {
				throw new Error("Failed to authenticate user");
			}

			// Ensure user has required NFT
			const nftResult = await ensureUserHasNFT(skyBrowser, web3Context);

			if (!nftResult.success) {
				throw new Error(nftResult.message || "Failed to get user NFT");
			}

			// Generate API key
			const lighthouseUrl =
				process.env.NEXT_PUBLIC_LIGHTHOUSE_SERVICE_URL;
			if (!lighthouseUrl) {
				throw new Error("Lighthouse service URL not configured");
			}

			const genResponse = await axios.post(
				`${lighthouseUrl}/generate-api-key`,
				{
					userAuthPayload: JSON.stringify(auth.data),
					accountNFT: JSON.stringify({
						collectionID: "0",
						nftID: nftResult.nftId!,
					}),
				},
				{
					headers: { "Content-Type": "application/json" },
				}
			);

			const apiKey = genResponse.data.data.apiKey;
			console.log("🔑 API Key generated successfully");

			return apiKey;
		} catch (error: any) {
			console.error("❌ Failed to generate API key:", error);
			throw new Error("Failed to generate API key");
		}
	}

	/**
	 * Get the current status of a workflow execution
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param requestId - The request ID from workflow execution
	 * @returns Promise with workflow status or null if not found
	 */
	async getWorkflowStatus(
		skyBrowser: any,
		web3Context: any,
		requestId: string
	): Promise<WorkflowStatus | null> {
		try {
			console.log(`📊 Checking status for request: ${requestId}`);

			// Generate API key
			const apiKey = await this.generateApiKey(skyBrowser, web3Context);

			const response = await axios.get(
				`${this.baseURL}/api/workflows/${requestId}`,
				{
					headers: {
						"Content-Type": "application/json",
						"x-api-key": apiKey,
					},
					timeout: 10000, // 10 second timeout
				}
			);

			console.log(`✅ Status retrieved for request: ${requestId}`);
			return response.data;
		} catch (error: any) {
			console.error(
				`❌ Failed to get status for request ${requestId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Get the current status of an individual tool execution
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param requestId - The request ID from tool execution
	 * @returns Promise with workflow status or null if not found
	 */
	async getIndividualToolStatus(
		skyBrowser: any,
		web3Context: any,
		requestId: string
	): Promise<WorkflowStatus | null> {
		try {
			console.log(`🔧 Checking tool status for request: ${requestId}`);

			// Generate API key
			const apiKey = await this.generateApiKey(skyBrowser, web3Context);

			const knowledgeBaseUrl = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_URL;
			if (!knowledgeBaseUrl) {
				throw new Error("Knowledge base URL not configured");
			}

			const response = await axios.get(
				`${knowledgeBaseUrl}/api/workflows/${requestId}`,
				{
					headers: {
						"Content-Type": "application/json",
						"x-api-key": apiKey,
					},
					timeout: 10000,
				}
			);

			console.log(`✅ Tool status retrieved for request: ${requestId}`);
			return response.data;
		} catch (error: any) {
			console.error(
				`❌ Failed to get tool status for request ${requestId}:`,
				error
			);
			return null;
		}
	}

	/**
	 * Start polling for status updates
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param requestId - The request ID to monitor
	 * @param onStatusUpdate - Callback when status updates
	 * @param onComplete - Callback when workflow completes
	 * @param onError - Callback when error occurs
	 * @param isIndividualTool - Whether this is an individual tool execution
	 * @param pollInterval - How often to check status (default: 2 seconds)
	 * @returns Cleanup function to stop polling
	 */
	startPolling(
		skyBrowser: any,
		web3Context: any,
		requestId: string,
		onStatusUpdate: (status: WorkflowStatus) => void,
		onComplete: (status: WorkflowStatus) => void,
		onError: (error: any) => void,
		isIndividualTool: boolean = false,
		pollInterval: number = 2000
	): () => void {
		console.log(`🔄 Starting polling for request: ${requestId}`);

		// Stop any existing polling for this request
		this.stopPolling(requestId);

		// Create polling interval
		const interval = setInterval(async () => {
			try {
				// Get current status
				const status = isIndividualTool
					? await this.getIndividualToolStatus(
							skyBrowser,
							web3Context,
							requestId
					  )
					: await this.getWorkflowStatus(
							skyBrowser,
							web3Context,
							requestId
					  );

				if (status) {
					// Notify about status update
					onStatusUpdate(status);

					// Check if workflow is complete
					if (
						status.workflowStatus === "completed" ||
						status.workflowStatus === "failed"
					) {
						console.log(
							`✅ Workflow ${status.workflowStatus} for request: ${requestId}`
						);
						this.stopPolling(requestId);
						onComplete(status);
					}
				}
			} catch (error) {
				console.error(
					`❌ Polling error for request ${requestId}:`,
					error
				);
				this.stopPolling(requestId);
				onError(error);
			}
		}, pollInterval);

		// Store the interval for cleanup
		this.pollingIntervals.set(requestId, interval);

		// Return cleanup function
		return () => this.stopPolling(requestId);
	}

	/**
	 * Stop polling for a specific request
	 *
	 * @param requestId - The request ID to stop polling for
	 */
	stopPolling(requestId: string): void {
		const interval = this.pollingIntervals.get(requestId);
		if (interval) {
			console.log(`🛑 Stopping polling for request: ${requestId}`);
			clearInterval(interval);
			this.pollingIntervals.delete(requestId);
		}
	}

	/**
	 * Stop all active polling
	 */
	stopAllPolling(): void {
		console.log("🛑 Stopping all polling intervals");
		this.pollingIntervals.forEach((interval) => clearInterval(interval));
		this.pollingIntervals.clear();
	}

	/**
	 * Get the number of active polling intervals
	 *
	 * @returns Number of active polling intervals
	 */
	getActivePollingCount(): number {
		return this.pollingIntervals.size;
	}
}

// Export a singleton instance
export const redisAgentService = RedisAgentService.getInstance();
