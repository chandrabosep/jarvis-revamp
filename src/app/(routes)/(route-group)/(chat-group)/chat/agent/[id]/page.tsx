"use client";
import ChatInput from "@/components/common/chat-input";
import React, { useEffect, useState } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter } from "next/navigation";
import { Agent } from "@/types";
import { getAgents } from "@/controllers/agents";

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

	// Handle mode switching
	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			// Clear selected agent and redirect to regular chat
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	// Handle prompt submission
	const handlePromptSubmit = () => {
		if (prompt.trim() && selectedAgent) {
			// Here you would typically send the prompt to the agent
			console.log(`Sending prompt to ${selectedAgent.name}:`, prompt);
			// You could also store the prompt in a chat history store
			// For now, just clear the prompt
			setPrompt("");
		}
	};

	// Try to fetch agent data if not in store
	useEffect(() => {
		const fetchAgent = async () => {
			if (!selectedAgent || selectedAgent.id !== agentId) {
				setIsLoading(true);
				try {
					// Try to fetch the specific agent
					const response = await getAgents({
						search: "",
						limit: 100,
					});
					const agent = response?.data?.agents?.find(
						(a: Agent) => a.id === agentId
					);

					if (agent) {
						setSelectedAgent(agent);
						setError(null);
					} else {
						setError("Agent not found");
					}
				} catch (err) {
					console.error("Error fetching agent:", err);
					setError("Failed to load agent");
				} finally {
					setIsLoading(false);
				}
			} else {
				setIsLoading(false);
			}
		};

		fetchAgent();
	}, [selectedAgent, agentId, setSelectedAgent]);

	// Show loading state
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-muted-foreground">Loading agent...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error || !selectedAgent || selectedAgent.id !== agentId) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						{error || "Agent not found"}
					</p>
					<button
						onClick={() => router.push("/create")}
						className="px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90"
					>
						Go to Create Page
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-full h-full flex flex-col">
			{/* Agent Header */}
			<div className="p-4 border-b border-border bg-background">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
						<span className="text-accent-foreground font-semibold text-sm">
							{selectedAgent.name.charAt(0).toUpperCase()}
						</span>
					</div>
					<div>
						<h2 className="text-lg font-semibold text-foreground">
							{selectedAgent.name}
						</h2>
						<p className="text-sm text-muted-foreground">
							{selectedAgent.description}
						</p>
					</div>
				</div>
			</div>

			{/* Chat Area */}
			<div className="flex-1 overflow-y-auto p-4">
				{/* Chat messages would go here */}
				<div className="text-center text-muted-foreground mt-8">
					Start chatting with {selectedAgent.name}
				</div>
			</div>

			{/* Chat Input */}
			<div className="p-4 border-t border-border bg-background">
				<ChatInput
					onSend={handlePromptSubmit}
					chatHistory={[]}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
				/>
			</div>
		</div>
	);
}
