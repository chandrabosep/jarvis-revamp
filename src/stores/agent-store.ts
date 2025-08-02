import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { AgentDetail } from "@/types";

interface AgentState {
	selectedAgents: { [id: string]: AgentDetail };

	// Actions
	setSelectedAgents: (agents: { [id: string]: AgentDetail }) => void;
	addAgent: (agent: AgentDetail) => void;
	removeAgent: (agentId: string) => void;
	reset: () => void;
}

export const useAgentStore = create<AgentState>()(
	subscribeWithSelector((set, get) => ({
		selectedAgents: {},

		setSelectedAgents: (selectedAgents) => set({ selectedAgents }),

		addAgent: (agent) =>
			set((state) => ({
				selectedAgents: { ...state.selectedAgents, [agent.id]: agent },
			})),

		removeAgent: (agentId) =>
			set((state) => {
				const { [agentId]: removed, ...rest } = state.selectedAgents;
				return { selectedAgents: rest };
			}),

		reset: () =>
			set({
				selectedAgents: {},
			}),
	}))
);
