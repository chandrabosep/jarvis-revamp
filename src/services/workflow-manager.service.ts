import {
	userAgentService,
	WorkflowRequest,
	WorkflowResponse,
} from "./user-agent.service";
import { redisAgentService, WorkflowStatus } from "./redis-agent.service";

// Options for workflow execution
export interface WorkflowExecutionOptions {
	skyBrowser: any;
	web3Context: any;
	agentId: string;
	prompt: string;
	workflow: any[];
	isIndividualTool?: boolean;
	activeNodeId?: string;
	onStatusUpdate?: (status: WorkflowStatus) => void;
	onComplete?: (status: WorkflowStatus) => void;
	onError?: (error: any) => void;
}

// Result of workflow execution
export interface WorkflowExecutionResult {
	success: boolean;
	requestId?: string;
	message?: string;
	error?: string;
	cleanup?: () => void;
}

/**
 * Workflow Manager Service
 *
 * This service combines user-agent and redis-agent services to provide
 * a unified interface for workflow execution and monitoring.
 *
 * It handles:
 * - Workflow execution (user-agent)
 * - Status monitoring (redis-agent)
 * - Polling management
 * - Error handling
 */
export class WorkflowManagerService {
	private static instance: WorkflowManagerService;

	private constructor() {}

	// Singleton pattern - ensures only one instance exists
	static getInstance(): WorkflowManagerService {
		if (!WorkflowManagerService.instance) {
			WorkflowManagerService.instance = new WorkflowManagerService();
		}
		return WorkflowManagerService.instance;
	}

	/**
	 * Execute a workflow with automatic status monitoring
	 *
	 * @param options - Workflow execution options
	 * @returns Promise with execution result and cleanup function
	 */
	async executeWorkflow(
		options: WorkflowExecutionOptions
	): Promise<WorkflowExecutionResult> {
		try {
			const {
				skyBrowser,
				web3Context,
				agentId,
				prompt,
				workflow,
				isIndividualTool = false,
				activeNodeId,
				onStatusUpdate,
				onComplete,
				onError,
			} = options;

			console.log("🚀 Starting workflow execution with monitoring...");

			// Step 1: Execute workflow using User Agent service
			const executionResult: WorkflowResponse = isIndividualTool
				? await userAgentService.executeIndividualTool(
						skyBrowser,
						web3Context,
						{
							prompt,
							workflow,
							activeNodeId,
						}
				  )
				: await userAgentService.executeWorkflow(
						skyBrowser,
						web3Context,
						{
							agentId,
							prompt,
							workflow,
						}
				  );

			// Step 2: Check if execution started successfully
			if (!executionResult.success || !executionResult.requestId) {
				console.error("❌ Workflow execution failed to start");
				return {
					success: false,
					error:
						executionResult.error ||
						"Failed to start workflow execution",
				};
			}

			console.log(
				`✅ Workflow started with request ID: ${executionResult.requestId}`
			);

			// Step 3: Start status monitoring with Redis Agent service
			const cleanup = redisAgentService.startPolling(
				skyBrowser,
				web3Context,
				executionResult.requestId,
				(status) => {
					console.log("📡 Workflow status update:", status);
					onStatusUpdate?.(status);
				},
				(status) => {
					console.log("✅ Workflow completed:", status);
					onComplete?.(status);
				},
				(error) => {
					console.error("❌ Workflow error:", error);
					onError?.(error);
				},
				isIndividualTool
			);

			return {
				success: true,
				requestId: executionResult.requestId,
				message: executionResult.message,
				cleanup,
			};
		} catch (error: any) {
			console.error("❌ Workflow manager error:", error);
			return {
				success: false,
				error: error.message || "Workflow execution failed",
			};
		}
	}

	/**
	 * Stop all active workflow monitoring
	 */
	stopAllWorkflows(): void {
		console.log("🛑 Stopping all workflow monitoring");
		redisAgentService.stopAllPolling();
	}

	/**
	 * Get the number of active workflow monitoring sessions
	 *
	 * @returns Number of active monitoring sessions
	 */
	getActiveWorkflowCount(): number {
		return redisAgentService.getActivePollingCount();
	}

	/**
	 * Check status of a specific workflow
	 *
	 * @param skyBrowser - The Skynet browser instance
	 * @param web3Context - Web3 context with user address
	 * @param requestId - The request ID to check
	 * @param isIndividualTool - Whether this is an individual tool execution
	 * @returns Promise with workflow status or null
	 */
	async checkWorkflowStatus(
		skyBrowser: any,
		web3Context: any,
		requestId: string,
		isIndividualTool: boolean = false
	): Promise<WorkflowStatus | null> {
		try {
			return isIndividualTool
				? await redisAgentService.getIndividualToolStatus(
						skyBrowser,
						web3Context,
						requestId
				  )
				: await redisAgentService.getWorkflowStatus(
						skyBrowser,
						web3Context,
						requestId
				  );
		} catch (error) {
			console.error("❌ Error checking workflow status:", error);
			return null;
		}
	}
}

// Export a singleton instance
export const workflowManagerService = WorkflowManagerService.getInstance();
