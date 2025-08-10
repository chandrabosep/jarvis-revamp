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
	const { skyBrowser, address } = useWallet();

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
			try {
				setIsExecuting(true);
				console.log(
					`Executing workflow for ${selectedAgent.name}:`,
					prompt
				);

				if (skyBrowser && address) {
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
								// Handle status updates here
								if (
									statusData.workflowStatus === "completed" ||
									statusData.workflowStatus === "failed"
								) {
									setIsExecuting(false);
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
			{isExecuting && (
				<div className="absolute top-4 left-4 right-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
					<div className="flex items-center gap-2">
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
						<span className="text-sm text-blue-800">
							Executing workflow for {selectedAgent?.name}...
						</span>
					</div>
				</div>
			)}

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
