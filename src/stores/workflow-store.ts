import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { WorkflowState } from "@/types";

interface WorkflowStoreState {
	selectedWorkflow: any;
	executionHistory: any[];

	// Actions
	setSelectedWorkflow: (workflow: any) => void;
	addToExecutionHistory: (execution: any) => void;
	clearExecutionHistory: () => void;
	reset: () => void;
}

export const useWorkflowStore = create<WorkflowStoreState>()(
	subscribeWithSelector((set) => ({
		selectedWorkflow: null,
		executionHistory: [],

		setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

		addToExecutionHistory: (execution) =>
			set((state) => ({
				executionHistory: [...state.executionHistory, execution],
			})),

		clearExecutionHistory: () => set({ executionHistory: [] }),

		reset: () =>
			set({
				selectedWorkflow: null,
				executionHistory: [],
			}),
	}))
);
