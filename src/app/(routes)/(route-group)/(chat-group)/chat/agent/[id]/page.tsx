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
	const { skyBrowser, address } = useWallet();
	const queryClient = useQueryClient();

	const { currentExecution } = useWorkflowExecutionStore();
	const { updateExecutionStatus } = useExecutionStatusStore();

	const {
		chatMessages,
		setChatMessages,
		pendingNotifications,
		setPendingNotifications,
		updateMessagesWithSubnetData,
		clearMessages,
		resetFeedbackState,
		setWorkflowId,
	} = useChatMessages();

	useEffect(() => {
		if (urlWorkflowId && chatMessages.length > 0) {
			setCachedChatMessages(urlWorkflowId, chatMessages);

			queryClient.setQueryData(["chat", urlWorkflowId], chatMessages);
		}
	}, [chatMessages, urlWorkflowId, queryClient]);

	useEffect(() => {
		if (urlWorkflowId) {
			const cachedMessages = getCachedChatMessages(urlWorkflowId);
			if (cachedMessages && cachedMessages.length > 0) {
				setChatMessages(cachedMessages);
			}
		}
	}, [urlWorkflowId, setChatMessages]);

	const {
		messagesEndRef,
		chatContainerRef,
		handleScroll,
		useScrollOnNewMessages,
	} = useChatScroll();

	const lastLoadedAgentId = useRef<string | null>(null);
	const hasAutoSubmittedRef = useRef(false);
	const lastQuestionRef = useRef<string | null>(null);

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
	}, [urlWorkflowId, skyBrowser, address, setChatMessages]);

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
		return () => {
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		};
	}, [updateExecutionStatus]);

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
	}, [isExecuting, currentWorkflowId, updateExecutionStatus]);

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
	}, [currentWorkflowData, updateExecutionStatus]);

	useEffect(() => {
		if (isLoading || !skyBrowser || !address) return;

		if (urlWorkflowId && urlWorkflowId.trim().length > 0) {
			if (currentWorkflowId !== urlWorkflowId) {
				if (currentWorkflowId) {
					clearWorkflow();
				}

				clearMessages();

				const cachedMessages = getCachedChatMessages(urlWorkflowId);
				if (cachedMessages && cachedMessages.length > 0) {
					setChatMessages(cachedMessages);
				}

				startPollingExistingWorkflow(
					urlWorkflowId,
					skyBrowser,
					address
				);
			}
		} else if (currentWorkflowId && !urlWorkflowId) {
			clearWorkflow();
			clearMessages();
		}
	}, [
		isLoading,
		skyBrowser,
		address,
		urlWorkflowId,
		currentWorkflowId,
		clearWorkflow,
		clearMessages,
		setChatMessages,
		startPollingExistingWorkflow,
	]);

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
	}, [agentId, selectedAgent, setSelectedAgent]);

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
								key={message.id}
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
									message.type === "question" &&
									message.questionData?.type !==
										"authentication"
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
							: workflowStatus
					}
				/>
			</div>
		</div>
	);
}
