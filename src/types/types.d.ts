export interface ChatInputProps {
	onSend: (message: string, selectedAgentId?: string) => void;
	chatHistory: { userPrompt: string; steps: IStep[] }[];
	mode: "chat" | "agent";
	setMode: (value: "chat" | "agent") => void;
	prompt: string;
	setPrompt: (value: string) => void;
}
