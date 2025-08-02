import { useCallback } from "react";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useExecutionStatusStore, useUIStore } from "@/stores";
import { WorkflowExecutionPayload } from "@/types";
import { STATUS } from "@/config/constants";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { Web3Context } from "@/types/wallet";

export function useWorkflowExecutor() {
	const { updateExecutionStatus } = useExecutionStatusStore();
	const { updateTestStatus } = useUIStore();

	const executeWorkflow = useCallback(
		async (
			payload: WorkflowExecutionPayload,
			skyBrowser: SkyMainBrowser,
			web3Context: Web3Context
		) => {
			try {
				// Set running state
				updateExecutionStatus({ isRunning: true });
				updateTestStatus({
					isRunning: true,
					status: STATUS.PROCESSING,
				});

				// Execute workflow with HTTP polling
				const requestId = await workflowExecutor.executeWorkflow(
					payload,
					skyBrowser,
					web3Context,
					(statusData) => {
						// Handle status updates from polling
						console.log("📡 Workflow status update:", statusData);

						// Update stores based on status
						if (
							statusData.workflowStatus === "completed" ||
							statusData.workflowStatus === "failed"
						) {
							updateExecutionStatus({ isRunning: false });
							updateTestStatus({
								isRunning: false,
								status:
									statusData.workflowStatus === "completed"
										? STATUS.TEST_COMPLETED
										: STATUS.FAILED,
							});
						}

						// Update current subnet for in-progress workflows
						if (statusData.workflowStatus === "in_progress") {
							updateExecutionStatus({
								currentSubnet: statusData.currentSubnet,
							});
						}
					}
				);

				// Store request ID
				updateExecutionStatus({ responseId: requestId });
			} catch (error: unknown) {
				updateExecutionStatus({ isRunning: false });
				updateTestStatus({ isRunning: false, status: STATUS.FAILED });
				throw error;
			}
		},
		[updateExecutionStatus, updateTestStatus]
	);

	return {
		executeWorkflow,
	};
}
