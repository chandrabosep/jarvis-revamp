"use client";
import ChatInput from "@/components/common/chat-input";
import React from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useRouter } from "next/navigation";

export default function ChatPage() {
	const { mode, setMode, prompt, setPrompt } = useGlobalStore();
	const router = useRouter();

	// Handle mode switching
	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "agent") {
			// If switching to agent mode, redirect to create page to select an agent
			router.push("/create");
		} else {
			setMode(newMode);
		}
	};

	// Handle prompt submission
	const handlePromptSubmit = () => {
		if (prompt.trim()) {
			// Handle the prompt submission here
			console.log("Submitting prompt:", prompt);
			// You could store the prompt in a chat history store
			// For now, just clear the prompt
			setPrompt("");
		}
	};

	return (
		<div className="relative w-full h-full">
			<div className="absolute bottom-4 w-full">
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
