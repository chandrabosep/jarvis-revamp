"use client";
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LucideArrowUp } from "lucide-react";
import { ChatInputProps } from "@/types/types";

import Marketplace from "./marketplace";

export default function ChatInput({
	onSend,
	chatHistory,
	mode,
	setMode,
	prompt,
	setPrompt,
}: ChatInputProps) {
	return (
		<div className="flex flex-col gap-y-2 w-full">
			<div className="flex items-center gap-2 w-full">
				<div className="flex items-center gap-2">
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
						onClick={() =>
							setMode(mode === "agent" ? "chat" : "agent")
						}
						type="button"
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
									mode === "agent" ? "-left-1.5" : "left-1"
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
				<Marketplace />
			</div>

			<div className="w-full flex items-center bg-input rounded-lg px-4 border border-border h-13">
				<Input
					className="flex-1 px-0 h-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base"
					type="text"
					placeholder={prompt}
					value={prompt}
					onChange={(e) => setPrompt(e.target.value)}
				/>
				<Button
					size="icon"
					className="!p-0 rounded-full bg-[#CDD1D4] hover:bg-[#CDD1D4]/90 text-background"
					type="submit"
					aria-label="Send"
				>
					<LucideArrowUp className="size-5.5" />
				</Button>
			</div>
		</div>
	);
}
