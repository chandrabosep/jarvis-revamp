export interface ChatInputProps {
	onSend: (message: string, selectedAgentId?: string) => void;
	onStop?: () => void;
	mode: "chat" | "agent";
	setMode: (value: "chat" | "agent") => void;
	prompt: string;
	setPrompt: (value: string) => void;
	hideModeSelection?: boolean;
	disableAgentSelection?: boolean;
	isExecuting?: boolean;
}
