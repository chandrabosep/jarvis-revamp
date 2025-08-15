"use client";
import ChatInput from "@/components/common/chat-input";
import { ChatMessage } from "@/components/common/chat-message";
import React, { useEffect, useState, useRef } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAgentById } from "@/controllers/agents";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";
import { useExecutionStatusStore } from "@/stores/execution-status-store";
import { Skeleton } from "@/components/ui/skeleton";
import ChatSkeleton from "@/components/common/chat-skeleton";
import { getOriginalPayload } from "@/controllers/requests";
import { Web3Context } from "@/types/wallet";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	setCachedChatMessages,
	getCachedChatMessages,
	clearChatCache,
} from "@/utils/chat-utils";

import { ChatMsg } from "@/types/chat";
import { useChatMessages } from "@/hooks/use-chat-messages";
import { useChatScroll } from "@/hooks/use-chat-scroll";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { useFeedback } from "@/hooks/use-feedback";

export default function AgentChatPage() {
	const {
		mode,
		setMode,
		prompt,
		setPrompt,
		selectedAgent,
		setSelectedAgent,
	} = useGlobalStore();
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const agentId = params.id as string;
	const urlWorkflowId = searchParams.get("workflowId");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isInFeedbackMode, setIsInFeedbackMode] = useState(false);
	const [isPolling, setIsPolling] = useState(false);
	const [isShowingCachedMessages, setIsShowingCachedMessages] =
		useState(false);
	const { skyBrowser, address } = useWallet();
	const queryClient = useQueryClient();

	const { currentExecution } = useWorkflowExecutionStore();
	const { updateExecutionStatus } = useExecutionStatusStore();

	const {
		chatMessages,
		setChatMessages,
		safeSetChatMessages,
		setChatMessagesWithWorkflowCheck,
		pendingNotifications,
		setPendingNotifications,
		updateMessagesWithSubnetData,
		clearMessages,
		resetFeedbackState,
		setWorkflowId,
	} = useChatMessages();

	useEffect(() => {
		if (urlWorkflowId) {
			const cachedMessages = getCachedChatMessages(urlWorkflowId);
			if (cachedMessages && cachedMessages.length > 0) {
				console.log(
					`📋 Loading cached messages for workflow: ${urlWorkflowId}`
				);
				setIsShowingCachedMessages(true);
				setChatMessagesWithWorkflowCheck(cachedMessages, urlWorkflowId);
			} else {
				console.log(
					`📋 No cached messages found for workflow: ${urlWorkflowId}`
				);
				setIsShowingCachedMessages(false);
			}
		}
	}, [urlWorkflowId]);

	const {
		messagesEndRef,
		chatContainerRef,
		handleScroll,
		useScrollOnNewMessages,
	} = useChatScroll();

	const lastLoadedAgentId = useRef<string | null>(null);
	const hasAutoSubmittedRef = useRef(false);
	const lastQuestionRef = useRef<string | null>(null);
	const previousWorkflowId = useRef<string | null>(null);
	const isLoadingExistingWorkflow = useRef(false);

	useScrollOnNewMessages(chatMessages.length);

	const {
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
	} = useWorkflowExecution({
		updateMessagesWithSubnetData,
		setChatMessages,
		setPrompt,
		setIsInFeedbackMode,
		resetFeedbackState,
		lastQuestionRef,
		setWorkflowId,
	});

	useEffect(() => {
		if (urlWorkflowId && chatMessages.length > 0) {
			const currentWorkflowIdFromData =
				currentWorkflowData?.requestId ||
				currentWorkflowData?.workflowId;

			if (currentWorkflowIdFromData === urlWorkflowId) {
				console.log(
					`💾 Caching messages for workflow: ${urlWorkflowId}`
				);
				setCachedChatMessages(urlWorkflowId, chatMessages);
				queryClient.setQueryData(["chat", urlWorkflowId], chatMessages);
			} else {
				console.log(
					`⚠️ Not caching messages - workflow mismatch: ${currentWorkflowIdFromData} vs ${urlWorkflowId}`
				);
			}
		}
	}, [chatMessages, urlWorkflowId, queryClient, currentWorkflowData]);

	useEffect(() => {
		if (currentWorkflowData && urlWorkflowId) {
			const workflowId =
				currentWorkflowData.requestId || currentWorkflowData.workflowId;
			if (workflowId === urlWorkflowId) {
				const status = currentWorkflowData.workflowStatus;
				const shouldPoll =
					status === "in_progress" || status === "waiting_response";

				setIsPolling(shouldPoll);

				if (shouldPoll) {
					console.log(
						`🔄 Workflow ${urlWorkflowId} is active (${status}), polling will continue...`
					);
				} else {
					console.log(
						`🏁 Workflow ${urlWorkflowId} is not active (${status}), polling stopped`
					);
				}

				// Debug: Log workflow status for troubleshooting
				console.log(`🔍 Workflow status debug:`, {
					workflowId,
					workflowStatus: currentWorkflowData.workflowStatus,
					subnets: currentWorkflowData.subnets?.map((s: any) => ({
						toolName: s.toolName,
						status: s.status,
						hasQuestion: !!s.question,
						questionType: s.question?.type,
					})),
				});

				// Check if this is the first update for an existing workflow
				const shouldIncludeHistory = isLoadingExistingWorkflow.current;

				// Reset the flag after first update
				if (isLoadingExistingWorkflow.current) {
					console.log(
						`📋 First update for existing workflow - including history`
					);
					isLoadingExistingWorkflow.current = false;
				}

				updateMessagesWithSubnetData(
					currentWorkflowData,
					lastQuestionRef,
					{
						includeHistory: shouldIncludeHistory, // Include history only on first load of existing workflow
						isExistingWorkflow: shouldIncludeHistory,
					}
				);
			} else {
				console.warn(
					`⚠️ Skipping message update for different workflow: ${workflowId} vs ${urlWorkflowId}`
				);
			}
		}
	}, [currentWorkflowData, urlWorkflowId]);

	// Add a cleanup effect that runs when the component unmounts
	useEffect(() => {
		return () => {
			// Ensure all polling is stopped when component unmounts
			if (currentWorkflowId) {
				console.log(
					`🛑 Component unmounting, stopping polling for workflow: ${currentWorkflowId}`
				);
				clearWorkflow();
			}

			// Clear execution status
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		};
	}, [currentWorkflowId, clearWorkflow, updateExecutionStatus]);

	useEffect(() => {
		return () => {
			clearMessages();
			clearWorkflow();
		};
	}, []);

	// Add a more robust cleanup effect for workflow changes
	useEffect(() => {
		// Cleanup function to ensure proper workflow state management
		const cleanupWorkflow = () => {
			if (currentWorkflowId && currentWorkflowId !== urlWorkflowId) {
				console.log(
					`🧹 Cleaning up previous workflow: ${currentWorkflowId}`
				);
				clearWorkflow();
			}
		};

		// Cleanup when component unmounts or workflow changes
		return () => {
			cleanupWorkflow();
		};
	}, [currentWorkflowId, urlWorkflowId, clearWorkflow]);

	// Enhanced workflow switching logic with proper cleanup
	useEffect(() => {
		if (isLoading || !skyBrowser || !address) return;

		if (urlWorkflowId && urlWorkflowId.trim().length > 0) {
			if (currentWorkflowId !== urlWorkflowId) {
				console.log(
					`🔄 Switching workflows: ${currentWorkflowId} -> ${urlWorkflowId}`
				);

				// Immediately stop any existing polling and clear state
				if (currentWorkflowId) {
					console.log(
						`🛑 Stopping polling for previous workflow: ${currentWorkflowId}`
					);
					clearWorkflow();
					// Force a small delay to ensure cleanup completes
					setTimeout(() => {
						// Only proceed if we're still on the same workflow
						if (urlWorkflowId === searchParams.get("workflowId")) {
							console.log(
								`🗑️ Clearing messages for workflow switch`
							);
							clearMessages();
							resetFeedbackState();

							setChatMessages([]);
							setPendingNotifications([]);
							setIsShowingCachedMessages(false);

							// Load cached messages for the new workflow
							const cachedMessages =
								getCachedChatMessages(urlWorkflowId);
							if (cachedMessages && cachedMessages.length > 0) {
								console.log(
									`📋 Loading cached messages for workflow: ${urlWorkflowId}`
								);
								setIsShowingCachedMessages(true);
								setChatMessagesWithWorkflowCheck(
									cachedMessages,
									urlWorkflowId
								);
							} else {
								console.log(
									`📋 No cached messages found for workflow: ${urlWorkflowId}`
								);
								setIsShowingCachedMessages(false);
							}

							// Start polling for the new workflow
							startPollingExistingWorkflow(
								urlWorkflowId,
								skyBrowser,
								address
							);
						}
					}, 100);
				} else {
					// No previous workflow, proceed immediately
					console.log(`🗑️ Clearing messages for new workflow`);
					clearMessages();
					resetFeedbackState();

					setChatMessages([]);
					setPendingNotifications([]);
					setIsShowingCachedMessages(false);

					setTimeout(() => {
						const cachedMessages =
							getCachedChatMessages(urlWorkflowId);
						if (cachedMessages && cachedMessages.length > 0) {
							console.log(
								`📋 Loading cached messages for workflow: ${urlWorkflowId}`
							);
							setIsShowingCachedMessages(true);
							setChatMessagesWithWorkflowCheck(
								cachedMessages,
								urlWorkflowId
							);
							// Don't include history since cached messages already have it
							isLoadingExistingWorkflow.current = false;
						} else {
							console.log(
								`📋 No cached messages found for workflow: ${urlWorkflowId}`
							);
							setIsShowingCachedMessages(false);
							// Include history on first load since no cached messages
							isLoadingExistingWorkflow.current = true;
						}

						startPollingExistingWorkflow(
							urlWorkflowId,
							skyBrowser,
							address
						);
					}, 0);
				}
			}
		} else if (currentWorkflowId && !urlWorkflowId) {
			console.log(`🔄 No workflow ID in URL, clearing current workflow`);
			clearWorkflow();
			clearMessages();
			resetFeedbackState();

			setChatMessages([]);
			setPendingNotifications([]);
			setIsShowingCachedMessages(false);
		}
	}, [
		isLoading,
		skyBrowser,
		address,
		urlWorkflowId,
		currentWorkflowId,
		clearWorkflow,
		clearMessages,
		resetFeedbackState,
		startPollingExistingWorkflow,
		searchParams,
	]);

	// Remove the duplicate workflow change effect that was causing conflicts
	// useEffect(() => {
	// 	if (
	// 		urlWorkflowId &&
	// 		currentWorkflowId &&
	// 		urlWorkflowId !== currentWorkflowId
	// 	) {
	// 		console.log(
	// 			`🔄 Workflow changed from ${currentWorkflowId} to ${urlWorkflowId}, clearing messages immediately`
	// 		);
	// 		clearMessages();
	// 		resetFeedbackState();

	// 		setChatMessages([]);
	// 			setPendingNotifications([]);
	// 			setIsShowingCachedMessages(false);
	// 		}
	// 	}, [urlWorkflowId, currentWorkflowId]);

	// Simplified workflow change detection
	useEffect(() => {
		if (urlWorkflowId && urlWorkflowId !== previousWorkflowId.current) {
			console.log(
				`🔄 URL workflow changed from ${previousWorkflowId.current} to ${urlWorkflowId}`
			);

			// Only clear if we have a previous workflow to clear
			if (previousWorkflowId.current) {
				console.log(`🗑️ Clearing messages for workflow change`);
				clearMessages();
				resetFeedbackState();

				setChatMessages([]);
				setPendingNotifications([]);
				setIsShowingCachedMessages(false);
			}

			previousWorkflowId.current = urlWorkflowId;
		}
	}, [urlWorkflowId, clearMessages, resetFeedbackState]);

	const {
		isSubmittingFeedback,
		handleFeedbackSubmit,
		handleFeedbackProceed,
		handleFeedbackResponse,
	} = useFeedback({
		currentWorkflowId,
		currentWorkflowData,
		skyBrowser,
		address,
		setChatMessages,
		setPrompt,
		setWorkflowStatus,
		setIsExecuting,
		setIsInFeedbackMode,
		resumePolling: () => {
			// Resume polling for the current workflow after feedback
			if (urlWorkflowId && skyBrowser && address) {
				console.log(
					`🔄 Resuming polling for workflow: ${urlWorkflowId}`
				);
				startPollingExistingWorkflow(
					urlWorkflowId,
					skyBrowser,
					address
				);
			}
		},
	});

	useEffect(() => {
		const extractOriginalPayload = async () => {
			if (urlWorkflowId && skyBrowser && address) {
				try {
					const originalPayload = await getOriginalPayload(
						urlWorkflowId,
						skyBrowser as SkyMainBrowser,
						{ address } as Web3Context
					);

					if (originalPayload?.originalRequestPayload?.prompt) {
						const userMessage: ChatMsg = {
							id: `user_${Date.now()}`,
							type: "user",
							content:
								originalPayload.originalRequestPayload.prompt,
							timestamp: new Date(),
						};

						setChatMessages((prevMessages) => {
							if (prevMessages.length === 0) {
								return [userMessage];
							}
							return prevMessages;
						});
					}
				} catch (error) {
					console.error("Failed to extract original payload:", error);
				}
			}
		};

		extractOriginalPayload();
	}, [urlWorkflowId, skyBrowser, address]);

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	const handlePromptSubmit = async (
		message: string,
		selectedAgentId?: string
	) => {
		if (!message.trim() || !selectedAgent || !skyBrowser || !address)
			return;

		if (
			isInFeedbackMode ||
			currentWorkflowData?.workflowStatus === "waiting_response"
		) {
			await handleFeedbackResponse(message);
			return;
		}

		if (isExecuting) return;

		try {
			await executeNewWorkflow(
				selectedAgent as AgentDetail,
				message,
				address,
				skyBrowser,
				{ address }
			);
		} catch (error) {
			console.error("Error executing workflow:", error);
		}
	};

	const handleStopExecution = async () => {
		if (!skyBrowser || !address) return;
		await stopExecution(skyBrowser, address);
	};

	const handleResumeExecution = async () => {
		if (!skyBrowser || !address) return;
		await resumeExecution(skyBrowser, address);
	};

	const handleNotificationYes = async (notification: ChatMsg) => {
		setPendingNotifications((prev) =>
			prev.filter((n) => n.id !== notification.id)
		);
	};

	const handleNotificationNo = async (notification: ChatMsg) => {
		setPendingNotifications((prev) =>
			prev.filter((n) => n.id !== notification.id)
		);
		await handleStopExecution();
	};

	useEffect(() => {
		if (isExecuting && currentWorkflowId) {
			updateExecutionStatus({
				isRunning: true,
				responseId: currentWorkflowId,
			});
		} else if (!isExecuting) {
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		}
	}, [isExecuting, currentWorkflowId]);

	useEffect(() => {
		if (
			currentWorkflowData?.subnets &&
			Array.isArray(currentWorkflowData.subnets)
		) {
			const inProgressSubnet = currentWorkflowData.subnets.find(
				(subnet: any) => subnet.status === "in_progress"
			);

			if (inProgressSubnet) {
				updateExecutionStatus({
					currentSubnet: inProgressSubnet.toolName,
				});
			}
		}
	}, [currentWorkflowData]);

	useEffect(() => {
		if (isLoading) return;

		if (hasAutoSubmittedRef.current) {
			if (!prompt || prompt.trim().length === 0) {
				hasAutoSubmittedRef.current = false;
			} else {
				return;
			}
		}

		if (urlWorkflowId) return;
		if (isExecuting && currentWorkflowId) return;

		const canAutoSubmit =
			selectedAgent &&
			selectedAgent.id === agentId &&
			prompt &&
			prompt.trim().length > 0 &&
			skyBrowser &&
			address &&
			!isExecuting &&
			!isSubmittingFeedback &&
			chatMessages.length === 0;

		if (canAutoSubmit) {
			hasAutoSubmittedRef.current = true;
			setTimeout(() => {
				handlePromptSubmit(prompt);
			}, 100);
		}
	}, [
		isLoading,
		selectedAgent?.id,
		agentId,
		prompt,
		skyBrowser,
		address,
		isExecuting,
		isSubmittingFeedback,
		chatMessages.length,
		urlWorkflowId,
		currentWorkflowId,
	]);

	useEffect(() => {
		let isMounted = true;
		const fetchAgent = async () => {
			if (
				!selectedAgent ||
				selectedAgent.id !== agentId ||
				lastLoadedAgentId.current !== agentId
			) {
				setIsLoading(true);
				try {
					const response = await getAgentById(agentId);
					const agent = response?.data;
					if (isMounted) {
						if (agent) {
							setSelectedAgent(agent);
							setError(null);
							lastLoadedAgentId.current = agentId;
						} else {
							setError("Agent not found");
						}
					}
				} catch (err) {
					console.error("Error fetching agent:", err);
					if (isMounted) setError("Failed to load agent");
				} finally {
					if (isMounted) setIsLoading(false);
				}
			} else {
				setIsLoading(false);
			}
		};

		fetchAgent();

		return () => {
			isMounted = false;
		};
	}, [agentId, selectedAgent]);

	if (isLoading) {
		return (
			<div className="relative w-full max-w-7xl mx-auto h-full flex flex-col">
				<ChatSkeleton />
				<div className="absolute bottom-4 left-0 right-0 px-4 space-y-2">
					<Skeleton className="h-6 w-24" />
					<div className="flex space-x-2">
						<Skeleton className="h-10 flex-1 rounded-md" />
						<Skeleton className="h-10 w-10 rounded-md" />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						{error || "Agent not found"}
					</p>
					<Button onClick={() => router.push("/create")}>
						Go to Create Page
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-full h-full flex flex-col">
			{chatMessages.length === 0 ? (
				<ChatSkeleton />
			) : (
				<div className="flex-1 p-4 pb-24 min-h-0">
					<div
						ref={chatContainerRef}
						className="overflow-y-auto scrollbar-hide h-[calc(100vh-10rem)] flex flex-col gap-4"
						onScroll={handleScroll}
					>
						{chatMessages.map((message, index) => (
							<ChatMessage
								key={`${urlWorkflowId}-${message.id}`}
								message={message}
								isLast={index === chatMessages.length - 1}
								onNotificationYes={handleNotificationYes}
								onNotificationNo={handleNotificationNo}
								isPendingNotification={pendingNotifications.some(
									(n) => n.id === message.id
								)}
								onFeedbackSubmit={handleFeedbackSubmit}
								onFeedbackProceed={handleFeedbackProceed}
								showFeedbackButtons={
									!isShowingCachedMessages &&
									message.type === "question" &&
									message.questionData?.type === "feedback" &&
									(message.subnetStatus ===
										"waiting_response" ||
										message.subnetStatus === "pending" ||
										currentWorkflowData?.workflowStatus ===
											"waiting_response" ||
										workflowStatus === "waiting_response")
								}
								workflowStatus={workflowStatus}
							/>
						))}
						<div ref={messagesEndRef} />
					</div>
				</div>
			)}

			<div className="absolute bottom-4 left-0 right-0 px-4">
				<ChatInput
					onSend={handlePromptSubmit}
					onStop={handleStopExecution}
					onResume={handleResumeExecution}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
					hideModeSelection={true}
					disableAgentSelection={true}
					isExecuting={
						(workflowStatus === "stopped" ? false : isExecuting) ||
						isSubmittingFeedback ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus ===
							  "in_progress") ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus === "pending") ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus ===
							  "waiting_response")
					}
					workflowStatus={
						workflowStatus === "stopped"
							? "stopped"
							: currentWorkflowData?.workflowStatus ===
							  "waiting_response"
							? "waiting_response"
							: workflowStatus === "pending"
							? undefined
							: workflowStatus
					}
				/>
			</div>
		</div>
	);
}
