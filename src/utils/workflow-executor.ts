import axios from "axios";
import { apiKeyManager } from "./api-key-manager";
import { WORKFLOW_ENDPOINTS } from "@/config/constants";
import { WorkflowExecutionPayload, WorkflowExecutionResponse } from "@/types";

export class WorkflowExecutor {
	private static instance: WorkflowExecutor;

	public static getInstance(): WorkflowExecutor {
		if (!WorkflowExecutor.instance) {
			WorkflowExecutor.instance = new WorkflowExecutor();
		}
		return WorkflowExecutor.instance;
	}

	/**
	 * Execute workflow using HTTP POST + Polling pattern
	 */
	public async executeWorkflow(
		payload: WorkflowExecutionPayload,
		skyBrowser: any,
		web3Context: any,
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
