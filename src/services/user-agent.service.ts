import axios from "axios";
import { getAuthWithRetry, ensureUserHasNFT } from "@/utils/skynetHelper";

// Simple interface for workflow execution
export interface WorkflowRequest {
	agentId: string;
	prompt: string;
	workflow: any[];
}

// Response from user-agent service
export interface WorkflowResponse {
	success: boolean;
	requestId?: string;
	message?: string;
	error?: string;
}

/**
 * User-Agent Service
 *
 * This service handles workflow execution on the Skynet network.
 * It's responsible for:
 * - Authenticating users
 * - Ensuring users have required NFTs
 * - Executing workflows
 * - Returning execution status
 */
export class UserAgentService {
	private static instance: UserAgentService;
	private baseURL: string;

	private constructor() {
		// Use environment variable for User-Agent service URL
		this.baseURL = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL || "";

		if (!this.baseURL) {
			console.warn("NEXT_PUBLIC_NFT_USER_AGENT_URL not configured");
		}
	}

	// Singleton pattern - ensures only one instance exists
	static getInstance(): UserAgentService {
		if (!UserAgentService.instance) {
			UserAgentService.instance = new UserAgentService();
		}
		return UserAgentService.instance;
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
	 * Execute a workflow
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param request - Workflow execution request
	 * @returns Promise with execution result
	 */
	async executeWorkflow(
		skyBrowser: any,
		web3Context: any,
		request: WorkflowRequest
	): Promise<WorkflowResponse> {
		try {
			console.log("🚀 Starting workflow execution...");

			// Step 1: Generate API key
			console.log("🔑 Generating API key...");
			const apiKey = await this.generateApiKey(skyBrowser, web3Context);

			// Step 2: Get user authentication
			console.log("📝 Getting user authentication...");
			const auth = await getAuthWithRetry(skyBrowser);

			if (!auth.success) {
				throw new Error("Failed to authenticate user");
			}

			// Step 3: Ensure user has required NFT
			console.log("🪙 Checking user NFT...");
			const nftResult = await ensureUserHasNFT(skyBrowser, web3Context);

			if (!nftResult.success) {
				throw new Error(nftResult.message || "Failed to get user NFT");
			}

			// Step 4: Prepare the full request payload
			const payload = {
				agentId: request.agentId,
				prompt: request.prompt,
				workflow: request.workflow,
				userAuthPayload: {
					userAddress: auth.data.userAddress,
					signature: auth.data.signature,
					message: auth.data.message,
				},
				accountNFT: {
					collectionID: "0",
					nftID: nftResult.nftId!,
				},
			};

			console.log("📤 Sending workflow to user-agent service...");

			// Step 5: Send request to user-agent service with API key
			const response = await axios.post(
				`${this.baseURL}/natural-request`,
				payload,
				{
					headers: {
						"Content-Type": "application/json",
						"x-api-key": apiKey,
					},
					timeout: 30000, // 30 second timeout
				}
			);

			console.log("✅ Workflow execution started successfully");

			return {
				success: true,
				requestId: response.data.requestId,
				message: "Workflow execution started successfully",
			};
		} catch (error: any) {
			console.error("❌ Workflow execution failed:", error);

			// Provide user-friendly error messages
			let errorMessage = "Workflow execution failed";

			if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	}

	/**
	 * Execute an individual tool (for single tool execution)
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param request - Tool execution request
	 * @returns Promise with execution result
	 */
	async executeIndividualTool(
		skyBrowser: any,
		web3Context: any,
		request: {
			prompt: string;
			workflow: any[];
			activeNodeId?: string;
		}
	): Promise<WorkflowResponse> {
		try {
			console.log("🔧 Starting individual tool execution...");

			// Step 1: Generate API key
			console.log("🔑 Generating API key...");
			const apiKey = await this.generateApiKey(skyBrowser, web3Context);

			// Step 2: Get user authentication
			const auth = await getAuthWithRetry(skyBrowser);

			if (!auth.success) {
				throw new Error("Failed to authenticate user");
			}

			// Step 3: Ensure user has required NFT
			const nftResult = await ensureUserHasNFT(skyBrowser, web3Context);

			if (!nftResult.success) {
				throw new Error(nftResult.message || "Failed to get user NFT");
			}

			// Step 4: Prepare payload for individual tool execution
			const payload = {
				prompt: request.prompt,
				userAuthPayload: {
					userAddress: auth.data.userAddress,
					signature: auth.data.signature,
					message: auth.data.message,
				},
				accountNFT: {
					collectionID: "0",
					nftID: nftResult.nftId!,
				},
				workflow: request.workflow,
				isIndividualToolRun: true,
				...(request.activeNodeId && {
					activeNodeId: request.activeNodeId,
				}),
			};

			console.log("📤 Sending tool execution request...");

			// Step 5: Send to knowledge base service for individual tools with API key
			const knowledgeBaseUrl = process.env.NEXT_PUBLIC_KNOWLEDGE_BASE_URL;
			if (!knowledgeBaseUrl) {
				throw new Error("Knowledge base URL not configured");
			}

			const response = await axios.post(
				`${knowledgeBaseUrl}/natural-request`,
				payload,
				{
					headers: {
						"Content-Type": "application/json",
						"x-api-key": apiKey,
					},
					timeout: 30000,
				}
			);

			console.log("✅ Individual tool execution started successfully");

			return {
				success: true,
				requestId: response.data.requestId,
				message: "Individual tool execution started",
			};
		} catch (error: any) {
			console.error("❌ Individual tool execution failed:", error);

			let errorMessage = "Tool execution failed";

			if (error.response?.data?.message) {
				errorMessage = error.response.data.message;
			} else if (error.message) {
				errorMessage = error.message;
			}

			return {
				success: false,
				error: errorMessage,
			};
		}
	}
}

// Export a singleton instance
export const userAgentService = UserAgentService.getInstance();
