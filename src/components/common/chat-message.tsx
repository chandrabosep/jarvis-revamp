import { cn } from "@/lib/utils";

interface ChatMessageProps {
	message: {
		id: string;
		type:
			| "user"
			| "response"
			| "question"
			| "answer"
			| "pending"
			| "workflow_subnet"
			| "pending";
		content: string;
		timestamp: Date;
		agentName?: string;
		subnetStatus?:
			| "pending"
			| "in_progress"
			| "done"
			| "failed"
			| "waiting_response";
		toolName?: string;
		subnetIndex?: number;
	};
	isLast?: boolean;
}

export function ChatMessage({ message, isLast = false }: ChatMessageProps) {
	if (message.type === "user") {
		return (
			<div className="mb-8">
				<div className="w-full">
					<h2 className="text-2xl font-bold text-white leading-tight mb-2 capitalize">
						{message.content}
					</h2>
					{/* <div className="text-xs text-gray-400">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div> */}
				</div>
			</div>
		);
	}

	if (message.type === "question") {
		return (
			<div className="relative flex items-start mb-6">
				{/* Vertical line that extends to connect with next message */}
				<div
					className={cn(
						"absolute left-2 top-0 w-px bg-gray-600 z-0",
						isLast ? "h-6" : "h-full"
					)}
				></div>

				<div className="relative z-10 flex-shrink-0 ml-1 mr-4">
					<div className="size-2 rounded-full bg-yellow-500"></div>
				</div>

				<div className="flex-1 min-w-0">
					<div className="text-sm text-yellow-300 font-medium mb-2">
						Feedback Question
					</div>
					<div className="text-yellow-100 text-sm leading-relaxed">
						{message.content}
					</div>
					{message.toolName && (
						<div className="text-xs text-yellow-300/70 mt-2 italic">
							From {message.toolName} agent
						</div>
					)}
					<div className="text-xs text-gray-500 mt-2">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>
		);
	}

	if (message.type === "answer") {
		return (
			<div className="relative flex items-start mb-6">
				{/* Vertical line that extends to connect with next message */}
				<div
					className={cn(
						"absolute left-2 top-0 w-px bg-gray-600 z-0",
						isLast ? "h-6" : "h-full"
					)}
				></div>

				<div className="relative z-10 flex-shrink-0 ml-0.5 mr-4">
					<div className="size-3 rounded-full border-2 border-gray-700 bg-gray-500"></div>
				</div>

				<div className="flex-1 min-w-0 ">
					<div className="w-fit px-5 py-0.5 rounded-xl border border-border text-foreground text-sm leading-relaxed whitespace-pre-wrap ">
						{message.content}
					</div>
					<div className="text-xs text-gray-500 mt-2">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>
		);
	}

	if (
		message.type === "workflow_subnet" &&
		message.subnetStatus === "pending"
	) {
		// Show pending subnet messages instead of hiding them
		return (
			<div className="relative flex items-start mb-6">
				{/* Vertical line that extends to connect with next message */}
				<div
					className={cn(
						"absolute left-2 top-0 w-px bg-gray-600 z-0",
						isLast ? "h-6" : "h-full"
					)}
				></div>

				<div className="relative z-10 flex-shrink-0 ml-0.5 mr-4">
					<div className="size-3 rounded-full border-2 border-gray-700 bg-gray-500"></div>
				</div>

				<div className="flex-1 min-w-0">
					{message.toolName && (
						<div className="text-sm text-gray-400 mb-1 italic">
							{message.toolName} agent queued
						</div>
					)}

					<div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
						{message.content}
					</div>

					<div className="text-xs text-gray-500 mt-2">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="relative flex items-start mb-6">
			<div className="absolute left-2 top-0 bottom-0 w-px bg-gray-600 z-0"></div>

			<div className="relative z-10 flex-shrink-0 ml-0.5 mr-4 rounded-full">
				{(message.type === "workflow_subnet" &&
					message.subnetStatus === "in_progress") ||
				message.type === "pending" ? (
					<span className="relative flex size-3">
						<span className="absolute h-full w-full animate-ping rounded-full bg-accent opacity-75"></span>
						<span className="relative size-3 inline-flex rounded-full bg-accent"></span>
					</span>
				) : message.type === "workflow_subnet" &&
				  message.subnetStatus === "waiting_response" ? (
					<span className="relative flex size-3">
						<span className="absolute h-full w-full animate-ping rounded-full bg-yellow-500 opacity-75"></span>
						<span className="relative size-3 inline-flex rounded-full bg-yellow-500"></span>
					</span>
				) : message.type === "workflow_subnet" &&
				  message.subnetStatus === "done" ? (
					<div className="size-3 rounded-full border-2 border-gray-700 bg-gray-500"></div>
				) : (
					// Default gray circle for any other status
					<div className="size-3 rounded-full border-2 border-gray-700 bg-gray-500"></div>
				)}
			</div>

			<div className="flex-1 min-w-0">
				{(message.agentName ||
					(message.type === "workflow_subnet" &&
						message.toolName)) && (
					<div
						className={`text-sm text-gray-400 mb-1${
							message.type === "workflow_subnet" &&
							message.toolName
								? " italic"
								: ""
						}`}
					>
						Message from{" "}
						{message.type === "workflow_subnet" && message.toolName
							? `${message.toolName} agent`
							: message.agentName}
						...
					</div>
				)}

				<div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
					{message.content}
				</div>

				<div className="text-xs text-gray-500 mt-2">
					{message.timestamp.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</div>
			</div>
		</div>
	);
}
