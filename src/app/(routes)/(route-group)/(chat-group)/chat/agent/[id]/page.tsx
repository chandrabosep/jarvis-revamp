"use client";
import ChatInput from "@/components/common/chat-input";
import React, { useEffect, useState, useRef } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter } from "next/navigation";
import { getAgentById } from "@/controllers/agents";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";

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
	const agentId = params.id as string;
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isExecuting, setIsExecuting] = useState(false);
	const [chatMessages, setChatMessages] = useState<
		Array<{
			id: string;
			type: "user" | "agent" | "system";
			content: string;
			timestamp: Date;
		}>
	>([]);
	const { skyBrowser, address } = useWallet();

	// Workflow execution store
	const {
		setCurrentExecution,
		updateExecutionStatus,
		setPollingStatus,
		currentExecution,
	} = useWorkflowExecutionStore();

	const lastLoadedAgentId = useRef<string | null>(null);

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	const handlePromptSubmit = async () => {
		if (prompt.trim() && selectedAgent && "subnet_list" in selectedAgent) {
			// Add user message to chat
			const userMessage = {
				id: Date.now().toString(),
				type: "user" as const,
				content: prompt,
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, userMessage]);

			try {
				setIsExecuting(true);
				console.log(
					`Executing workflow for ${selectedAgent.name}:`,
					prompt
				);

				if (skyBrowser && address) {
					// Add system message indicating workflow start
					const systemMessage = {
						id: (Date.now() + 1).toString(),
						type: "system" as const,
						content: `Starting workflow execution for ${selectedAgent.name}...`,
						timestamp: new Date(),
					};
					setChatMessages((prev) => [...prev, systemMessage]);

					const requestId =
						await workflowExecutor.executeAgentWorkflow(
							selectedAgent as AgentDetail,
							prompt,
							address,
							skyBrowser,
							{ address },
							(statusData) => {
								console.log(
									"Workflow status update:",
									statusData
								);

								// Update the workflow execution store with the status data
								if (statusData.workflowStatus) {
									const executionStatus = {
										requestId:
											statusData.requestId || requestId,
										userAddress: address,
										workflowStatus:
											statusData.workflowStatus as
												| "pending"
												| "in_progress"
												| "completed"
												| "failed",
										percentage: statusData.percentage || 0,
										totalSubnets:
											statusData.totalSubnets || 0,
										completedSubnets:
											statusData.completedSubnets || 0,
										authUrl: statusData.authUrl || null,
										authRequiredSubnet:
											statusData.authRequiredSubnet ||
											null,
										createdAt:
											statusData.createdAt ||
											new Date().toISOString(),
										updatedAt:
											statusData.updatedAt ||
											new Date().toISOString(),
										lastActivity:
											statusData.lastActivity ||
											new Date().toISOString(),
										subnets: statusData.subnets || [],
									};

									if (
										currentExecution?.requestId ===
										executionStatus.requestId
									) {
										updateExecutionStatus(executionStatus);
									} else {
										setCurrentExecution(executionStatus);
									}
								}

								// Handle status updates here
								if (
									statusData.workflowStatus === "completed" ||
									statusData.workflowStatus === "failed"
								) {
									setIsExecuting(false);
									setPollingStatus(false);

									// Add completion message to chat
									const completionMessage = {
										id: (Date.now() + 2).toString(),
										type: "system" as const,
										content: `Workflow ${
											statusData.workflowStatus ===
											"completed"
												? "completed successfully"
												: "failed"
										}.`,
										timestamp: new Date(),
									};
									setChatMessages((prev) => [
										...prev,
										completionMessage,
									]);
								} else {
									setPollingStatus(true);
								}
							}
						);

					console.log("Workflow started with ID:", requestId);
					setPrompt(""); // Clear prompt after successful submission
				} else {
					console.warn(
						"Missing required context for workflow execution"
					);
				}
			} catch (error) {
				console.error("Failed to execute workflow:", error);
				setIsExecuting(false);
				setPollingStatus(false);
			}
		}
	};

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
	}, [agentId]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-muted-foreground">Loading agent...</p>
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
			{/* Status indicator */}
			{isExecuting && !currentExecution && (
				<div className="flex-shrink-0 p-4 border-b bg-blue-50 border-blue-200">
					<div className="flex items-center gap-2">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
						<span className="text-sm text-blue-800">
							Executing workflow for {selectedAgent?.name}...
						</span>
					</div>
				</div>
			)}

			{/* Chat Input - Fixed at bottom */}
			<div className="absolute bottom-4 w-full">
				<ChatInput
					onSend={handlePromptSubmit}
					chatHistory={[]}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
					hideModeSelection={true}
					disableAgentSelection={true}
				/>
			</div>
		</div>
	);
}
