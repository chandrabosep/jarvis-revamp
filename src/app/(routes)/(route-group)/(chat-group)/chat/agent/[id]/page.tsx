"use client";
import ChatInput from "@/components/common/chat-input";
import { ChatMessage } from "@/components/common/chat-message";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter } from "next/navigation";
import { getAgentById } from "@/controllers/agents";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";

type ChatMsg = {
	id: string;
	type: "user" | "response" | "question" | "answer";
	content: string;
	timestamp: Date;
};

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
	const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
	const { skyBrowser, address } = useWallet();

	const { setPollingStatus, stopCurrentExecution, currentExecution } =
		useWorkflowExecutionStore();

	const lastLoadedAgentId = useRef<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	// Helper: Parse agent response from workflow result
	const parseAgentResponse = (subnetData: string): string | null => {
		try {
			const parsed = JSON.parse(subnetData);
			const data = parsed?.data;
			if (data?.data?.choices?.[0]?.message?.content) {
				return data.data.choices[0].message.content;
			}
			if (data?.message) {
				return data.message;
			}
			return null;
		} catch {
			return null;
		}
	};

	const handlePromptSubmit = useCallback(async () => {
		if (prompt.trim() && selectedAgent && "subnet_list" in selectedAgent) {
			const userMessage: ChatMsg = {
				id: Date.now().toString(),
				type: "user",
				content: prompt,
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, userMessage]);

			try {
				setIsExecuting(true);

				if (skyBrowser && address) {
					const onStatusUpdate = (data: any) => {
						// Only show completed responses, and only for subnets that are done
						if (
							data &&
							data.workflowStatus === "completed" &&
							Array.isArray(data.subnets)
						) {
							const completedSubnets = data.subnets.filter(
								(s: any) => s.status === "done"
							);
							// Only show the first completed subnet's response for now
							if (completedSubnets.length > 0) {
								const subnet = completedSubnets[0];
								const agentResponse = parseAgentResponse(
									subnet.data
								);
								if (agentResponse) {
									setChatMessages((prev) => [
										...prev,
										{
											id: `agent_${Date.now()}`,
											type: "response",
											content: agentResponse,
											timestamp: new Date(),
										},
									]);
								}
								setIsExecuting(false);
								setPollingStatus(false);
							}
						}
					};

					await workflowExecutor.executeAgentWorkflow(
						selectedAgent as AgentDetail,
						prompt,
						address,
						skyBrowser,
						{ address },
						onStatusUpdate
					);

					setPollingStatus(true);
					setPrompt("");
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
	}, [
		prompt,
		selectedAgent,
		skyBrowser,
		address,
		setPrompt,
		setPollingStatus,
	]);

	const handleStopExecution = () => {
		stopCurrentExecution();
		setIsExecuting(false);
		setPollingStatus(false);
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatMessages]);

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
			<div className="flex-1 overflow-y-auto p-4 pb-24 min-h-0">
				{chatMessages.length === 0 ? (
					<div className="flex items-center justify-center h-full min-h-[400px]">
						<div className="text-center text-gray-500">
							<p className="text-lg font-medium">
								Start a conversation with {selectedAgent?.name}
							</p>
							<p className="text-sm mt-2 text-gray-400">
								Type your request below to begin
							</p>
						</div>
					</div>
				) : (
					<div className="space-y-4">
						{chatMessages.map((message) => (
							<ChatMessage key={message.id} message={message} />
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<div className="absolute bottom-4 left-0 right-0 px-4">
				<ChatInput
					onSend={handlePromptSubmit}
					onStop={handleStopExecution}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
					hideModeSelection={true}
					disableAgentSelection={true}
					isExecuting={
						isExecuting ||
						currentExecution?.workflowStatus === "in_progress" ||
						currentExecution?.workflowStatus === "pending"
					}
				/>
			</div>
		</div>
	);
}
