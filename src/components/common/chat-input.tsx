"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LucideArrowUp, Plus } from "lucide-react";
import { ChatInputProps } from "@/types/types";

export default function ChatInput({
	onSend,
	suggestions,
	chatHistory,
	autoMode,
	setAutoMode,
}: ChatInputProps) {
	const [value, setValue] = useState("");
	return (
		<div className="flex flex-col gap-y-2">
			<div className="flex items-center justify-between gap-2">
				<Button size="sm" className="w-fit">
					<Plus />
				</Button>
				<div className="flex items-center gap-2 ml-auto">
					<button
						className={`
							relative w-23 h-7 rounded-full cursor-pointer transition-colors duration-200
							flex items-center justify-center overflow-hidden text-xs font-medium font-sans  
							${autoMode === true ? "bg-accent" : "bg-input border border-border"}
							${autoMode === true ? "flex-row" : "flex-row-reverse"}
							text-white
							leading-none whitespace-nowrap p-0
						`}
						onClick={() => setAutoMode(!autoMode)}
						type="button"
						aria-pressed={autoMode === true}
					>
						<span
							className={`
								flex-1 z-[1] font-medium transition-colors duration- pt-0.5
								${autoMode === true ? "text-left ml-4 mr-0" : "text-right ml-0 mr-4"}
							`}
						>
							{autoMode === true ? "Auto On" : "Auto Off"}
						</span>
						<div
							className={`
								absolute top-1/2 left-1 w-[18px] h-[18px] bg-[#CDD1D4] rounded-full
								shadow-[0_2px_4px_rgba(0,0,0,0.2)] z-[2] transition-transform duration-[750ms] ease-[cubic-bezier(0.4,0,0.2,1)]
							`}
							style={{
								transform:
									autoMode === true
										? "translateX(62px) translateY(-50%)"
										: "translateX(0) translateY(-50%)",
							}}
						/>
					</button>
				</div>
			</div>

			<div className="w-full flex items-center bg-input rounded-lg px-4 border border-border h-13">
				<Input
					className="flex-1 px-0 h-full border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground text-base"
					type="text"
					placeholder="Give new task..."
					value={value}
					onChange={(e) => setValue(e.target.value)}
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
			<div className="flex flex-row items-center gap-x-2.5">
				{suggestions.map(({ icon, title, suggestion }, index) => (
					<Button
						key={index}
						className="flex flex-row items-center gap-x-2 border border-border rounded-full"
						data-suggestion-text={suggestion}
						size="sm"
						onClick={() => {}}
						type="button"
					>
						{icon}
						<p className="text-sm font-medium">{title}</p>
					</Button>
				))}
			</div>
		</div>
	);
}
