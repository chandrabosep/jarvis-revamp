"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LucideArrowUp } from "lucide-react";
import { ChatInputProps } from "@/types/types";
import { useGlobalStore } from "@/stores/global-store";
import { useRouter } from "next/navigation";
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";

import Marketplace from "./marketplace";

export default function ChatInput({
	onSend,
	chatHistory,
	mode,
	setMode,
	prompt,
	setPrompt,
	hideModeSelection = false,
	disableAgentSelection = false,
}: ChatInputProps) {
	const { selectedAgent, setSelectedAgent } = useGlobalStore();
	const router = useRouter();
	const { skyBrowser, address } = useWallet();
	const { executeAgentWorkflow } = useWorkflowExecutor();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (mode === "agent") {
			if (!selectedAgent || !prompt.trim()) {
				return;
			}

			// Navigate to agent chat page first
			router.push(`/chat/agent/${selectedAgent.id}`);

			// Execute workflow if we have the required context
			if (
				skyBrowser &&
				address &&
				selectedAgent &&
				"subnet_list" in selectedAgent
			) {
				try {
					console.log(
						"Executing workflow for agent:",
						selectedAgent.name
					);
					console.log("User prompt:", prompt);

					const requestId = await executeAgentWorkflow(
						selectedAgent as AgentDetail,
						prompt,
						address,
						skyBrowser,
						{ address }, // Create a simple web3Context
						(statusData: any) => {
							console.log("Workflow status update:", statusData);
							// You can add status handling here (e.g., update UI, show progress)
						}
					);

					console.log("Workflow started with ID:", requestId);

					// Clear the prompt after successful submission
					setPrompt("");
				} catch (error) {
					console.error("Failed to execute workflow:", error);
					// You can add error handling here (e.g., show error message)
				}
			} else {
				console.warn("Missing required context for workflow execution");
				// Still navigate to the page, but workflow execution will happen there
			}
		} else {
			if (!prompt.trim()) return;
			router.push("/chat");
		}
	};

	const isAgentMode = mode === "agent";
	const isAgentSelected = !!selectedAgent;
	const canType = !isAgentMode || (isAgentMode && isAgentSelected);
	const canSubmit =
		(isAgentMode && isAgentSelected && !!prompt.trim()) ||
		(!isAgentMode && !!prompt.trim());

	return (
		<form onSubmit={handleSubmit} className="flex flex-col gap-y-2 w-full">
			<div className="flex items-center gap-2 w-full">
				{!hideModeSelection && (
					<div className="flex items-center gap-2 min-w-[110px]">
						<button
							className={`
								relative h-7 rounded-full cursor-pointer transition-colors duration-200
								flex items-center justify-center overflow-hidden text-xs font-medium font-sans  
								${
									mode === "agent"
										? "bg-accent text-accent-foreground w-27"
										: "bg-input border border-border text-foreground w-26"
								}
								${mode === "agent" ? "flex-row" : "flex-row-reverse"}
								leading-none whitespace-nowrap p-0
							`}
							type="button"
							onClick={() => {
								if (mode === "agent") {
									setSelectedAgent(null);
								}
								setMode(mode === "agent" ? "chat" : "agent");
							}}
							aria-pressed={mode === "agent"}
						>
							<span
								className={`
									flex-1 z-[1] font-medium transition-colors duration- pt-0.5
									${mode === "agent" ? "text-right ml-0 mr-7" : "text-left ml-7 mr-0"}
								`}
							>
								{mode === "agent" ? "Agent Mode" : "Chat Mode"}
							</span>
							<div
								className={`
									absolute top-1/2 ${
										mode === "agent"
											? "-left-1.5"
											: "left-1"
									} size-4.5 bg-[#CDD1D4] rounded-full
									shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-[2] transition-transform duration-[750ms] ease-[cubic-bezier(0.4,0,0.2,1)]
								`}
								style={{
									transform:
										mode === "agent"
											? "translateX(92px) translateY(-50%)"
											: "translateX(0) translateY(-50%)",
								}}
							/>
						</button>
					</div>
				)}
				<Marketplace disabled={disableAgentSelection} />
			</div>

			<div className="w-full flex items-center bg-input rounded-lg px-4 border border-border h-13">
				<Input
					className="flex-1 px-0 h-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base"
					type="text"
					placeholder={
						isAgentMode
							? isAgentSelected
								? `Ask ${selectedAgent.name} anything...`
								: "Select an agent first..."
							: prompt || "Type your message..."
					}
					value={prompt}
					onChange={(e) => {
						if (canType) {
							setPrompt(e.target.value);
						}
					}}
					disabled={!canType}
				/>
				<Button
					size="icon"
					className="!p-0 rounded-full bg-[#CDD1D4] hover:bg-[#CDD1D4]/90 text-background disabled:opacity-50 disabled:cursor-not-allowed"
					type="submit"
					aria-label="Send"
					disabled={!canSubmit}
				>
					<LucideArrowUp className="size-5.5" />
				</Button>
			</div>
		</form>
	);
}
