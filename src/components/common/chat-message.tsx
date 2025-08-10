import { cn } from "@/lib/utils";

interface ChatMessageProps {
	message: {
		id: string;
		type: "user" | "response" | "question" | "answer" | "pending";
		content: string;
		timestamp: Date;
		agentName?: string;
	};
}

export function ChatMessage({ message }: ChatMessageProps) {
	const getDotColor = () => {
		switch (message.type) {
			case "user":
				return "bg-accent";
			case "response":
				return "bg-accent";
			case "question":
				return "bg-accent";
			case "pending":
				return "bg-accent";
			default:
				return "bg-accent";
		}
	};

	// Special rendering for user messages
	if (message.type === "user") {
		return (
			<div className="mb-8">
				<div className="w-full">
					<h2 className="text-2xl font-bold text-white leading-tight mb-2">
						{message.content}
					</h2>
					<div className="text-xs text-gray-400">
						{message.timestamp.toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</div>
				</div>
			</div>
		);
	}

	// Timeline rendering for agent messages
	return (
		<div className="relative flex items-start mb-6">
			{/* Continuous vertical line - only show if not the last message */}
			<div className="absolute left-2 top-0 bottom-0 w-px bg-gray-600"></div>

			{/* Dot indicator */}
			<div className="relative z-10 flex-shrink-0 mr-4">
				<div
					className={cn(
						"w-4 h-4 rounded-full border-2 border-gray-900",
						getDotColor(),
						message.type === "pending" && "animate-pulse"
					)}
				></div>
			</div>

			{/* Message Content */}
			<div className="flex-1 min-w-0">
				{/* Agent name header */}
				{message.agentName && (
					<div className="text-sm text-gray-400 mb-1">
						Message from {message.agentName}...
					</div>
				)}

				{/* Message text */}
				<div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
					{message.content}
				</div>

				{/* Timestamp */}
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
