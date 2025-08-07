export interface ChatInputProps {
	onSend: (message: string, selectedAgentId?: string) => void;
	chatHistory: { userPrompt: string; steps: IStep[] }[];
	autoMode: boolean;
	prompt: string;
	setAutoMode: (value: boolean) => void;
	setPrompt: (value: string) => void;
}
