import { useState, useCallback, useRef } from "react";
import {
	workflowManagerService,
	WorkflowExecutionOptions,
	WorkflowStatus,
} from "@/services/workflow-manager.service";

// Return type for the hook
export interface UseWorkflowExecutionReturn {
	executeWorkflow: (
		options: Omit<
			WorkflowExecutionOptions,
			"onStatusUpdate" | "onComplete" | "onError"
		>
	) => Promise<void>;
	isExecuting: boolean;
	currentStatus: WorkflowStatus | null;
	error: string | null;
	stopExecution: () => void;
	clearError: () => void;
}

/**
 * React Hook for Workflow Execution
 *
 * This hook provides a simple interface for executing workflows
 * with automatic status monitoring and error handling.
 *
 * Features:
 * - Execute workflows with one function call
 * - Automatic status monitoring
 * - Error handling and state management
 * - Cleanup on unmount
 */
export function useWorkflowExecution(): UseWorkflowExecutionReturn {
	const [isExecuting, setIsExecuting] = useState(false);
	const [currentStatus, setCurrentStatus] = useState<WorkflowStatus | null>(
		null
	);
	const [error, setError] = useState<string | null>(null);
	const cleanupRef = useRef<(() => void) | null>(null);

	/**
	 * Execute a workflow with automatic monitoring
	 */
	const executeWorkflow = useCallback(
		async (
			options: Omit<
				WorkflowExecutionOptions,
				"onStatusUpdate" | "onComplete" | "onError"
			>
		) => {
			try {
				// Reset state
				setIsExecuting(true);
				setError(null);
				setCurrentStatus(null);

				console.log("🚀 Starting workflow execution...");

				const result = await workflowManagerService.executeWorkflow({
					...options,
					onStatusUpdate: (status) => {
						console.log("📡 Status update received:", status);
						setCurrentStatus(status);
					},
					onComplete: (status) => {
						console.log("✅ Workflow completed:", status);
						setCurrentStatus(status);
						setIsExecuting(false);

						// Clean up polling
						if (cleanupRef.current) {
							cleanupRef.current();
							cleanupRef.current = null;
						}
					},
					onError: (error) => {
						console.error("❌ Workflow error:", error);
						setError(error.message || "Execution failed");
						setIsExecuting(false);

						// Clean up polling
						if (cleanupRef.current) {
							cleanupRef.current();
							cleanupRef.current = null;
						}
					},
				});

				if (result.success && result.cleanup) {
					// Store cleanup function
					cleanupRef.current = result.cleanup;
				} else {
					// Execution failed to start
					setError(result.error || "Failed to start execution");
					setIsExecuting(false);
				}
			} catch (error: any) {
				console.error("❌ Hook execution error:", error);
				setError(error.message || "Execution failed");
				setIsExecuting(false);
			}
		},
		[]
	);

	/**
	 * Stop current execution and cleanup
	 */
	const stopExecution = useCallback(() => {
		console.log("🛑 Stopping workflow execution...");

		// Stop all workflows
		workflowManagerService.stopAllWorkflows();

		// Clean up current execution
		if (cleanupRef.current) {
			cleanupRef.current();
			cleanupRef.current = null;
		}

		setIsExecuting(false);
	}, []);

	/**
	 * Clear current error
	 */
	const clearError = useCallback(() => {
		setError(null);
	}, []);

	// Cleanup on unmount
	const cleanup = useCallback(() => {
		if (cleanupRef.current) {
			cleanupRef.current();
		}
		workflowManagerService.stopAllWorkflows();
	}, []);

	// Set up cleanup on unmount
	if (typeof window !== "undefined") {
		// Only run in browser
		window.addEventListener("beforeunload", cleanup);
	}

	return {
		executeWorkflow,
		isExecuting,
		currentStatus,
		error,
		stopExecution,
		clearError,
	};
}
