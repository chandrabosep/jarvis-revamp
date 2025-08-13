"use client";
import ChatInput from "@/components/common/chat-input";
import React, { useEffect } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useRouter } from "next/navigation";
// import Image from "next/image";
import Spline from "@splinetool/react-spline";
// import SvgAnimationParticles from "@/components/common/svg-animaiton-particles";

export default function CreatePage() {
	const { mode, prompt, setPrompt, setMode, selectedAgent } =
		useGlobalStore();
	const router = useRouter();

	const handleModeChange = (newMode: "chat" | "agent") => {
		setMode(newMode);
	};

	const handlePromptSubmit = () => {
		if (prompt.trim()) {
			if (mode === "agent") {
				if (selectedAgent) {
					router.push(`/chat/agent/${selectedAgent.id}`);
				} else {
					console.log("❌ No selected agent");
				}
			} else {
				console.log("🔄 Navigating to: /chat");
				router.push("/chat");
			}
		} else {
			console.log("❌ Empty prompt, not navigating");
		}
	};

	return (
		<div className="flex flex-col items-center h-full w-full relative gap-y-20">
			<div className="w-full h-fit flex flex-col items-center justify-center gap-y-10 mt-[20%]">
				<div className="w-full h-96	 relative">
					{/* <Image
					src="/full-logo.svg"
					alt="Create"
					width={1000}
					height={1000}
					className="w-full max-w-80 h-full"
				/> */}
					{/* <SvgAnimationParticles /> */}
					<Spline
						scene="https://prod.spline.design/P39fXqJAJJIM6P0m/scene.splinecode"
						className="size-40 absolute"
					/>
					<div className="absolute bottom-5 right-5 h-10 w-36 bg-background"></div>
				</div>
			</div>
			<div className="w-fit min-w-4xl">
				<ChatInput
					onSend={handlePromptSubmit}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
				/>
			</div>
		</div>
	);
}
