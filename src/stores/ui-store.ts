import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { TestStatus } from "@/types";

interface UIStoreState {
	testStatus: TestStatus;

	// Actions
	updateTestStatus: (status: Partial<TestStatus>) => void;
	reset: () => void;
}

export const useUIStore = create<UIStoreState>()(
	subscribeWithSelector((set) => ({
		testStatus: {
			isRunning: false,
			status: "idle",
		},

		updateTestStatus: (status) =>
			set((state) => ({
				testStatus: {
					...state.testStatus,
					...status,
				},
			})),

		reset: () =>
			set({
				testStatus: {
					isRunning: false,
					status: "idle",
				},
			}),
	}))
);
