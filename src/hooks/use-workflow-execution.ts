import { useState, useCallback } from "react";
import { ChatMsg, WorkflowStatus } from "@/types/chat";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { Web3Context } from "@/types/wallet";
import { AgentDetail } from "@/types";

interface UseWorkflowExecutionProps {
	updateMessagesWithSubnetData: (
		data: any,
		lastQuestionRef: React.MutableRefObject<string | null>
	) => void;
	setChatMessages: React.Dispatch<React.SetStateAction<ChatMsg[]>>;
	setPrompt: (prompt: string) => void;
	setIsInFeedbackMode: (inMode: boolean) => void;
	resetFeedbackState: () => void;
	lastQuestionRef: React.MutableRefObject<string | null>;
}

export const useWorkflowExecution = ({
	updateMessagesWithSubnetData,
	setChatMessages,
	setPrompt,
	setIsInFeedbackMode,
	resetFeedbackState,
	lastQuestionRef,
}: UseWorkflowExecutionProps) => {
	const [isExecuting, setIsExecuting] = useState(false);
	const [currentWorkflowData, setCurrentWorkflowData] = useState<any>(null);
	const [workflowStatus, setWorkflowStatus] =
		useState<WorkflowStatus>("running");
	const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
		null
	);

	const { setPollingStatus, stopCurrentExecution } =
		useWorkflowExecutionStore();
	const { executeAgentWorkflow } = useWorkflowExecutor();

	const createStatusUpdateHandler = useCallback(
		(isNewWorkflow = false) => {
			return (data: any) => {
				console.log("📊 Status update received:", data);
				setCurrentWorkflowData(data);

				if (data?.requestId && !currentWorkflowId) {
					setCurrentWorkflowId(data.requestId);
					workflowExecutor.setCurrentWorkflowId(data.requestId);
				}

				// Add user prompt if it's a new workflow
				if (
					isNewWorkflow &&
					data?.userPrompt &&
					data.userPrompt.trim().length > 0
				) {
					setChatMessages((prevMessages) => {
						const hasUserMessage = prevMessages.some(
							(msg) => msg.type === "user"
						);
						if (!hasUserMessage) {
							const userMessage: ChatMsg = {
								id: `user_${Date.now()}`,
								type: "user",
								content: data.userPrompt,
								timestamp: new Date(),
							};
							return [userMessage, ...prevMessages];
						}
						return prevMessages;
					});
				}

				// Update messages with subnet data
				updateMessagesWithSubnetData(data, lastQuestionRef);

				// Handle workflow status changes
				if (data.workflowStatus === "completed") {
					setIsExecuting(false);
					setPollingStatus(false);
					setWorkflowStatus("completed");
					setIsInFeedbackMode(false);
					resetFeedbackState();

					// Add completion message
					setChatMessages((prev) => {
						const hasCompletionMessage = prev.some(
							(msg) =>
								msg.type === "response" &&
								msg.content === "Workflow executed successfully"
						);

						if (!hasCompletionMessage) {
							const completionMessage: ChatMsg = {
								id: `completion_${Date.now()}`,
								type: "response",
								content: "Workflow executed successfully",
								timestamp: new Date(),
							};
							return [...prev, completionMessage];
						}
						return prev;
					});
				} else if (data.workflowStatus === "failed") {
					setIsExecuting(false);
					setPollingStatus(false);
					setWorkflowStatus("failed");
					setIsInFeedbackMode(false);
					resetFeedbackState();

					// Add error message only if it doesn't already exist
					setChatMessages((prev) => {
						const hasErrorMessage = prev.some(
							(msg) =>
								msg.type === "response" &&
								msg.content === "Workflow execution failed"
						);

						if (!hasErrorMessage) {
							const errorMessage: ChatMsg = {
								id: `error_${Date.now()}`,
								type: "response",
								content: "Workflow execution failed",
								timestamp: new Date(),
							};
							return [...prev, errorMessage];
						}
						return prev;
					});
				} else if (data.workflowStatus === "stopped") {
					setIsExecuting(false);
					setPollingStatus(false);
					setWorkflowStatus("stopped");
					setIsInFeedbackMode(false);
					resetFeedbackState();

					if (data.requestId && !currentWorkflowId) {
						setCurrentWorkflowId(data.requestId);
					}

					workflowExecutor.handleExternalStatusChange("stopped");
					stopCurrentExecution();
				} else if (data.workflowStatus === "in_progress") {
					setIsExecuting(true);
					setPollingStatus(true);
					setWorkflowStatus("in_progress");
					setIsInFeedbackMode(false);
				} else if (data.workflowStatus === "waiting_response") {
					setIsExecuting(true);
					setPollingStatus(true);
					setWorkflowStatus("waiting_response");
					setIsInFeedbackMode(true);
				}
			};
		},
		[
			currentWorkflowId,
			updateMessagesWithSubnetData,
			lastQuestionRef,
			setChatMessages,
			setPollingStatus,
			stopCurrentExecution,
			setIsInFeedbackMode,
			resetFeedbackState,
		]
	);

	const startPollingExistingWorkflow = useCallback(
		async (
			workflowId: string,
			skyBrowser: SkyMainBrowser,
			address: string
		) => {
			if (!skyBrowser || !address) {
				console.warn(
					"Cannot start polling: missing skyBrowser or address",
					{ skyBrowser: !!skyBrowser, address: !!address }
				);
				return;
			}

			try {
				setIsExecuting(true);
				setPollingStatus(true);
				setWorkflowStatus("in_progress");
				setCurrentWorkflowId(workflowId);

				workflowExecutor.setCurrentWorkflowId(workflowId);

				const onStatusUpdate = createStatusUpdateHandler(false);

				const success =
					await workflowExecutor.startPollingExistingWorkflow(
						workflowId,
						skyBrowser,
						{ address },
						onStatusUpdate
					);

				if (!success) {
					throw new Error(
						"Failed to start polling for existing workflow"
					);
				}
			} catch (error) {
				console.error(
					"Error starting polling for existing workflow:",
					error
				);
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("failed");
			}
		},
		[setPollingStatus, createStatusUpdateHandler]
	);

	const executeNewWorkflow = useCallback(
		async (
			selectedAgent: AgentDetail,
			message: string,
			address: string,
			skyBrowser: SkyMainBrowser,
			web3Context: Web3Context
		) => {
			try {
				setIsExecuting(true);
				setPollingStatus(true);
				setWorkflowStatus("running");
				setIsInFeedbackMode(false);
				resetFeedbackState();

				// Clear previous state
				setChatMessages([]);
				setCurrentWorkflowData(null);
				lastQuestionRef.current = null;

				// Add user message
				const userMessage: ChatMsg = {
					id: `user_${Date.now()}`,
					type: "user",
					content: message,
					timestamp: new Date(),
				};
				setChatMessages([userMessage]);

				const onStatusUpdate = createStatusUpdateHandler(true);

				const workflowId = await executeAgentWorkflow(
					selectedAgent as any,
					message,
					address,
					skyBrowser,
					web3Context,
					onStatusUpdate
				);

				setCurrentWorkflowId(workflowId);
				workflowExecutor.setCurrentWorkflowId(workflowId);

				// Update URL with workflow ID
				const currentUrl = new URL(window.location.href);
				currentUrl.searchParams.set("workflowId", workflowId);
				window.history.replaceState({}, "", currentUrl.toString());

				setPrompt("");
				return workflowId;
			} catch (error) {
				console.error("Error executing workflow:", error);
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("failed");
				throw error;
			}
		},
		[
			setPollingStatus,
			setIsInFeedbackMode,
			resetFeedbackState,
			setChatMessages,
			lastQuestionRef,
			createStatusUpdateHandler,
			executeAgentWorkflow,
			setPrompt,
		]
	);

	const stopExecution = useCallback(
		async (skyBrowser: SkyMainBrowser, address: string) => {
			if (!skyBrowser || !address || !currentWorkflowId) {
				console.warn("Cannot stop execution: missing required data");
				return;
			}

			try {
				const success = await workflowExecutor.emergencyStop(
					skyBrowser,
					{ address },
					"User requested emergency stop",
					currentWorkflowId
				);

				if (success) {
					setIsExecuting(false);
					setPollingStatus(false);
					setWorkflowStatus("stopped");
					stopCurrentExecution();
				} else {
					console.error("❌ Failed to emergency stop workflow");
				}
			} catch (error) {
				console.error("Error during emergency stop:", error);
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("stopped");
				stopCurrentExecution();
			}
		},
		[currentWorkflowId, setPollingStatus, stopCurrentExecution]
	);

	const resumeExecution = useCallback(
		async (skyBrowser: SkyMainBrowser, address: string) => {
			if (!skyBrowser || !address || !currentWorkflowId) {
				console.warn("Cannot resume execution: missing required data");
				return;
			}

			try {
				const newStatusCallback = (data: any) => {
					setCurrentWorkflowData(data);

					if (data?.requestId && !currentWorkflowId) {
						setCurrentWorkflowId(data.requestId);
						workflowExecutor.setCurrentWorkflowId(data.requestId);
					}
				};

				workflowExecutor.setCurrentStatusCallback(newStatusCallback);

				const success = await workflowExecutor.resumeWorkflow(
					skyBrowser,
					{ address },
					currentWorkflowId
				);

				if (success) {
					setIsExecuting(true);
					setPollingStatus(true);
					setWorkflowStatus("running");
				} else {
					console.error("❌ Failed to resume workflow");
				}
			} catch (error) {
				console.error("Error during workflow resume:", error);
				setIsExecuting(true);
				setPollingStatus(true);
				setWorkflowStatus("running");
			}
		},
		[currentWorkflowId, setPollingStatus]
	);

	const clearWorkflow = useCallback(() => {
		setCurrentWorkflowId(null);
		setCurrentWorkflowData(null);
		setIsExecuting(false);
		setPollingStatus(false);
		setWorkflowStatus("running");
		setIsInFeedbackMode(false);
		resetFeedbackState();
		workflowExecutor.clearCurrentWorkflow();
	}, [setPollingStatus, setIsInFeedbackMode, resetFeedbackState]);

	return {
		isExecuting,
		setIsExecuting,
		currentWorkflowData,
		setCurrentWorkflowData,
		workflowStatus,
		setWorkflowStatus,
		currentWorkflowId,
		setCurrentWorkflowId,
		startPollingExistingWorkflow,
		executeNewWorkflow,
		stopExecution,
		resumeExecution,
		clearWorkflow,
	};
};
