import axios from "axios";
import { apiKeyManager } from "./api-key-manager";
import { WORKFLOW_ENDPOINTS } from "@/config/constants";
import {
	WorkflowExecutionPayload,
	WorkflowExecutionResponse,
	AgentDetail,
} from "@/types";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { Web3Context } from "@/types/wallet";

export class WorkflowExecutor {
	private static instance: WorkflowExecutor;

	public static getInstance(): WorkflowExecutor {
		if (!WorkflowExecutor.instance) {
			WorkflowExecutor.instance = new WorkflowExecutor();
		}
		return WorkflowExecutor.instance;
	}

	/**
	 * Get authentication data with signature from Skynet
	 */
	private async getAuthData(
		skyBrowser: SkyMainBrowser,
		userAddress: string
	): Promise<{ signature: string; message: string }> {
		try {
			// Get authentication from Skynet
			const authResponse = await skyBrowser?.appManager?.getUrsulaAuth();

			if (
				authResponse?.success &&
				authResponse.data?.signature &&
				authResponse.data?.message
			) {
				return {
					signature: authResponse.data.signature,
					message: authResponse.data.message,
				};
			}

			// Fallback: create a basic message and signature
			const message = `Authenticate workflow execution for ${userAddress} at ${Date.now()}`;
			const signature = await this.signMessage(message, skyBrowser);

			return { signature, message };
		} catch (error) {
			console.warn(
				"Failed to get auth from Skynet, using fallback:",
				error
			);
			// Fallback: create a basic message and signature
			const message = `Authenticate workflow execution for ${userAddress} at ${Date.now()}`;
			const signature = await this.signMessage(message, skyBrowser);

			return { signature, message };
		}
	}

	/**
	 * Sign a message using the connected wallet
	 */
	private async signMessage(
		message: string,
		skyBrowser: SkyMainBrowser
	): Promise<string> {
		try {
			// Try to get the signer from the contract service
			const signer = skyBrowser?.contractService?.signer;
			if (signer && typeof signer.signMessage === "function") {
				return await signer.signMessage(message);
			}

			// Fallback: return a placeholder signature
			console.warn("No signer available, using placeholder signature");
			return "placeholder_signature_" + Date.now();
		} catch (error) {
			console.warn("Failed to sign message:", error);
			return "placeholder_signature_" + Date.now();
		}
	}

	/**
	 * Automatically construct execution payload from agent details and user prompt
	 */
	public async constructExecutionPayload(
		agentDetail: AgentDetail,
		userPrompt: string,
		userAddress: string,
		skyBrowser: SkyMainBrowser
	): Promise<WorkflowExecutionPayload> {
		// Get authentication data
		const authData = await this.getAuthData(skyBrowser, userAddress);

		// Transform subnet_list to workflow format
		const workflow = agentDetail.subnet_list.map((subnet) => ({
			itemID: subnet.itemID.toString(),
			agentCollection: {
				agentAddress: agentDetail.nft_address,
				agentID: "0",
			},
			feedback: subnet.feedback || false, // Include feedback if available
		}));

		return {
			agentId: agentDetail.id,
			prompt: userPrompt,
			workflow: workflow,
		};
	}

	/**
	 * Get user's NFT ID from the agent collection
	 */
	public async getUserNFTId(
		agentDetail: AgentDetail,
		userAddress: string,
		skyBrowser: SkyMainBrowser
	): Promise<string> {
		try {
			// Try to get the first NFT the user owns from the agent collection
			const userNftBalance =
				await skyBrowser.contractService.AgentNFT.balanceOf(
					userAddress
				);

			if (userNftBalance && userNftBalance > 0) {
				const firstNftId =
					await skyBrowser.contractService.AgentNFT.tokenOfOwnerByIndex(
						userAddress,
						0
					);
				return firstNftId.toString();
			}

			// Fallback to using the agent's NFT ID if user doesn't own any
			return agentDetail.agentNFTId || "0";
		} catch (error) {
			console.warn("Failed to get user's NFT ID, using fallback:", error);
			return agentDetail.agentNFTId || "0";
		}
	}

	/**
	 * Convenience method: Construct payload and execute workflow in one call
	 */
	public async executeAgentWorkflow(
		agentDetail: AgentDetail,
		userPrompt: string,
		userAddress: string,
		skyBrowser: SkyMainBrowser,
		web3Context: Web3Context,
		onStatusUpdate?: (data: WorkflowExecutionResponse) => void
	): Promise<string> {
		// Construct the payload automatically with authentication
		const payload = await this.constructExecutionPayload(
			agentDetail,
			userPrompt,
			userAddress,
			skyBrowser
		);

		// Optionally get the user's actual NFT ID
		try {
			const userNFTId = await this.getUserNFTId(
				agentDetail,
				userAddress,
				skyBrowser
			);
			if (payload.accountNFT) {
				payload.accountNFT.nftID = userNFTId;
			}
		} catch (error) {
			console.warn("Using fallback NFT ID:", error);
		}

		// Execute the workflow
		return this.executeWorkflow(
			payload,
			skyBrowser,
			web3Context,
			onStatusUpdate
		);
	}

	/**
	 * Execute workflow using HTTP POST + Polling pattern
	 */
	public async executeWorkflow(
		payload: WorkflowExecutionPayload,
		skyBrowser: SkyMainBrowser,
		web3Context: Web3Context,
		onStatusUpdate?: (data: WorkflowExecutionResponse) => void
	): Promise<string> {
		// Get API key
		const apiKey = await apiKeyManager.getApiKey(skyBrowser, web3Context);

		const headers = {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
		};

		// Use full workflow endpoint
		const endpoint = WORKFLOW_ENDPOINTS.FULL_WORKFLOW;

		// Log the complete payload for debugging
		console.log(
			"🚀 Executing workflow with payload:",
			JSON.stringify(payload, null, 2)
		);

		// Initiate workflow with HTTP POST
		const response = await axios.post(endpoint, payload, { headers });
		const requestId = response.data.requestId;

		// Start polling for status updates
		this.startPolling(requestId, apiKey, onStatusUpdate);

		return requestId;
	}

	/**
	 * Poll workflow status every 2 seconds
	 */
	private startPolling(
		requestId: string,
		apiKey: string,
		onStatusUpdate?: (data: WorkflowExecutionResponse) => void
	): void {
		const pollingInterval = setInterval(async () => {
			try {
				const statusEndpoint = `${WORKFLOW_ENDPOINTS.FULL_WORKFLOW_STATUS}/${requestId}`;

				const statusResponse = await axios.get(statusEndpoint, {
					headers: {
						"x-api-key": apiKey,
						"Content-Type": "application/json",
					},
				});

				const statusData = statusResponse.data;

				// Call status update callback
				if (onStatusUpdate) {
					onStatusUpdate(statusData);
				}

				// Clear interval when workflow is completed or failed
				const isCompleted =
					statusData.workflowStatus === "completed" ||
					statusData.workflowStatus === "failed";

				if (isCompleted) {
					clearInterval(pollingInterval);
				}
			} catch (error) {
				console.error("Polling error:", error);
				clearInterval(pollingInterval);
			}
		}, 2000); // Poll every 2 seconds
	}
}

export const workflowExecutor = WorkflowExecutor.getInstance();
