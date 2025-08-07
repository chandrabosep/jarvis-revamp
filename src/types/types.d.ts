export interface ChatInputProps {
	onSend: (message: string, selectedAgentId?: string) => void;
	suggestions: {
		icon: ReactNode;
		title: string;
		suggestion: string;
	}[];
	chatHistory: { userPrompt: string; steps: IStep[] }[];
	autoMode: boolean;
	setAutoMode: (value: boolean) => void;
}
