"use client";
import ChatInput from "@/components/common/chat-input";
import { GemIcon, PaletteIcon, RocketIcon } from "lucide-react";
import React from "react";
import { useGlobalStore } from "@/stores/global-store";

export default function ChatPage() {
	const { autoMode, setAutoMode } = useGlobalStore();
	return (
		<div className="relative w-full h-full">
			<div className="absolute bottom-4 w-full">
				<ChatInput
					onSend={() => {}}
					chatHistory={[]}
					autoMode={autoMode}
					setAutoMode={setAutoMode}
					suggestions={[
						{
							icon: <RocketIcon />,
							title: "Mint an NFT collection",
							suggestion:
								"Generate and mint an NFT with a description of 'Unicorn collection' and an image of a robot unicorn.",
						},
						{
							icon: <GemIcon />,
							title: "Create content and Tweet",
							suggestion:
								"Create a tweet and image about a conversation between The Lion King and The Troll King, and post it on Twitter",
						},
						{
							icon: <PaletteIcon />,
							title: "Generate image and upload",
							suggestion:
								"Generate an image of the beautiful future we have with Skynet and store it on AWS.",
						},
					]}
				/>
			</div>
		</div>
	);
}
