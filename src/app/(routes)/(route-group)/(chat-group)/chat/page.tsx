"use client";
import ChatInput from "@/components/common/chat-input";
import React from "react";
import { useGlobalStore } from "@/stores/global-store";

export default function ChatPage() {
	const { mode, setMode, prompt, setPrompt } = useGlobalStore();
	return (
		<div className="relative w-full h-full">
			<div className="absolute bottom-4 w-full">
				<ChatInput
					onSend={() => {}}
					chatHistory={[]}
					mode={mode}
					setMode={setMode}
					prompt={prompt}
					setPrompt={setPrompt}
				/>
			</div>
		</div>
	);
}
