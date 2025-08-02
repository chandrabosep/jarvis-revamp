import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { WorkflowExecutionPayload, WorkflowExecutionResponse } from "@/types";

interface WorkflowStoreState {
	selectedWorkflow: WorkflowExecutionPayload | null;
	executionHistory: WorkflowExecutionResponse[];

	// Actions
	setSelectedWorkflow: (workflow: WorkflowExecutionPayload | null) => void;
	addToExecutionHistory: (execution: WorkflowExecutionResponse) => void;
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
