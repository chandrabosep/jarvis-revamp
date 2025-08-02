import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { Agent } from "@/types";

interface AgentState {
	selectedAgents: { [id: string]: any };

	// Actions
	setSelectedAgents: (agents: { [id: string]: any }) => void;
	addAgent: (agent: any) => void;
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
