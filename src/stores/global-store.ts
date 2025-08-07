import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { persist } from "zustand/middleware";

// Global Store State
interface GlobalStore {
	// User and Wallet Management
	userAddress: string | null;
	accountNFTId: string | null;

	// Mode and Agent Management
	mode: "chat" | "agent";
	prompt: string;

	// Auto Mode
	autoMode: boolean;

	// Actions - Wallet & NFT Management
	setUserAddress: (address: string | null) => void;
	setAccountNFTId: (nftId: string | null) => void;

	setMode: (mode: "chat" | "agent") => void;
	setPrompt: (prompt: string) => void;

	reset: () => void;
}

export const useGlobalStore = create<GlobalStore>()(
	subscribeWithSelector(
		persist(
			(set) => ({
				// Initial State
				userAddress: null,
				accountNFTId: null,
				mode: "agent",
				prompt: "",
				autoMode: false,

				// Wallet & NFT Management Actions
				setUserAddress: (address) => set({ userAddress: address }),
				setAccountNFTId: (nftId) => set({ accountNFTId: nftId }),

				// Mode Management Actions
				setMode: (mode) => set({ mode }),
				setPrompt: (prompt) => set({ prompt }),

				// Reset
				reset: () =>
					set({
						userAddress: null,
						accountNFTId: null,
						mode: "agent",
						prompt: "",
					}),
			}),
			{
				name: "global-store",
				partialize: (state) => ({
					userAddress: state.userAddress,
					accountNFTId: state.accountNFTId,
					mode: state.mode,
					prompt: state.prompt,
				}),
			}
		)
	)
);
