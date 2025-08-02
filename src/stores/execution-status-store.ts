import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { ExecutionStatus } from "@/types";

interface ExecutionStatusState {
	isRunning: boolean;
	responseId?: string;
	currentSubnet?: string;

	// Actions
	updateExecutionStatus: (status: Partial<ExecutionStatus>) => void;
	reset: () => void;
}

export const useExecutionStatusStore = create<ExecutionStatusState>()(
	subscribeWithSelector((set) => ({
		isRunning: false,
		responseId: undefined,
		currentSubnet: undefined,

		updateExecutionStatus: (status) =>
			set((state) => ({
				...state,
				...status,
			})),

		reset: () =>
			set({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			}),
	}))
);
