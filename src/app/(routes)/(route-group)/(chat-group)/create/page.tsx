"use client";
import ChatInput from "@/components/common/chat-input";
import React, { useEffect } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { RocketIcon, GemIcon, PaletteIcon } from "lucide-react";
import ChatCard from "@/components/common/chat-card";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function CreatePage() {
	const { autoMode, prompt, setAutoMode, setPrompt } = useGlobalStore();
	const router = useRouter();

	const handleClick = (prompt: string) => {
		setPrompt(prompt);
		router.push("/chat");
	};

	useEffect(() => {
		setPrompt("");
	}, [setPrompt]);

	return (
		<div className="flex flex-col items-center h-full w-full relative">
			<div className="flex flex-col items-center justify-center gap-y-10 h-3/4">
				<Image
					src="/full-logo.svg"
					alt="create-page-bg"
					width={1000}
					height={1000}
					className="w-56 h-fit"
				/>
				<div className="flex items-center justify-center gap-6">
					<ChatCard
						title="Mint an NFT collection"
						description=" Go on-chain"
						icon={<RocketIcon className="size-5" />}
						onClick={() =>
							handleClick(
								"Generate and mint an NFT with a description of 'Unicorn collection' and an image of a robot unicorn."
							)
						}
					/>
					<ChatCard
						title="Create content and Tweet"
						description="Generate & Post"
						icon={<GemIcon className="size-5" />}
						onClick={() =>
							handleClick(
								"Create a tweet and image about a conversation between The Lion King and The Troll King, and post it on Twitter"
							)
						}
					/>
					<ChatCard
						title="Generate image and upload"
						description="Turn text to art"
						icon={<PaletteIcon className="size-5" />}
						onClick={() =>
							handleClick(
								"Generate an image of the beautiful future we have with Skynet and store it on AWS."
							)
						}
					/>
				</div>
			</div>
			<div className="absolute bottom-4 w-full">
				<ChatInput
					onSend={() => {}}
					chatHistory={[]}
					autoMode={autoMode}
					setAutoMode={setAutoMode}
					prompt={prompt}
					setPrompt={setPrompt}
				/>
			</div>
		</div>
	);
}
