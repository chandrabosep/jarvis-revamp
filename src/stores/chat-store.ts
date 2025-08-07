import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";

interface ChatStore {
	agentAddress?: string;
	agentNFTId?: string;

	// Workflow Status
	workflowStatus:
		| "idle"
		| "running"
		| "completed"
		| "failed"
		| "auth_required";
	percentage: number;
	currentSubnet?: string;
	workflowId: string;

	// Chat
	prompt: string;

	// UI State
	isLoading: boolean;
	error: string | null;

	// Actions - Agent Management
	setAgentAddress: (address: string) => void;
	setAgentNFTId: (nftId: string) => void;

	// Actions - Workflow Management
	setWorkflowStatus: (status: ChatStore["workflowStatus"]) => void;
	setPercentage: (percentage: number) => void;
	setCurrentSubnet: (subnet: string) => void;
	setWorkflowId: (id: string) => void;

	// Actions - Chat Management
	setPrompt: (prompt: string) => void;

	// Actions - UI State
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	clearError: () => void;

	// Reset
	reset: () => void;
}

export const useChatStore = create<ChatStore>()(
	subscribeWithSelector(
		persist(
			(set) => ({
				// Initial State
				agentAddress: undefined,
				agentNFTId: undefined,
				workflowStatus: "idle",
				percentage: 0,
				currentSubnet: undefined,
				workflowId: "",
				prompt: "",
				isLoading: false,
				error: null,

				// Agent Management Actions
				setAgentAddress: (address) => set({ agentAddress: address }),
				setAgentNFTId: (nftId) => set({ agentNFTId: nftId }),

				// Workflow Management Actions
				setWorkflowStatus: (status) => set({ workflowStatus: status }),
				setPercentage: (percentage) => set({ percentage }),
				setCurrentSubnet: (subnet) => set({ currentSubnet: subnet }),
				setWorkflowId: (id) => set({ workflowId: id }),

				// Chat Management Actions
				setPrompt: (prompt: string) => set({ prompt }),

				// UI State Actions
				setLoading: (loading) => set({ isLoading: loading }),
				setError: (error) => set({ error }),
				clearError: () => set({ error: null }),

				// Reset
				reset: () =>
					set({
						agentAddress: undefined,
						agentNFTId: undefined,
						workflowStatus: "idle",
						percentage: 0,
						currentSubnet: undefined,
						workflowId: "",
						prompt: "",
						isLoading: false,
						error: null,
					}),
			}),
			{
				name: "chat-store",
				partialize: (state) => ({
					agentAddress: state.agentAddress,
					agentNFTId: state.agentNFTId,
					workflowStatus: state.workflowStatus,
					percentage: state.percentage,
					currentSubnet: state.currentSubnet,
					workflowId: state.workflowId,
					prompt: state.prompt,
				}),
			}
		)
	)
);
