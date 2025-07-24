export interface WalletState {
	isConnected: boolean;
	address: string | null;
	balance: string | null;
	chainId: number | null;
}

export interface NFTResult {
	success: boolean;
	nftId?: string;
	action?: "existing" | "minted" | "error";
	message?: string;
	mintPrice?: string;
	userBalance?: string;
}

export interface AuthPayload {
	userAddress: string;
	signature: string;
	message: string;
}
