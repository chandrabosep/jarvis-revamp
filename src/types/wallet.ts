// Wallet Types
export interface NFTResult {
	success: boolean;
	nftId?: string;
	action?: "existing" | "minted" | "error";
	message?: string;
	mintPrice?: string;
	userBalance?: string;
}

export interface AgentNFTResult {
	success: boolean;
	agentId?: string;
	action?: "existing" | "minted" | "error";
	message?: string;
	mintPrice?: string;
	userBalance?: string;
}

export interface Web3Context {
	address: string;
}

export interface Web3Auth {
	provider?: unknown;
}

export interface AgentData {
	nft_address?: string;
	collection_id?: string;
	originalId?: string;
}

export interface VerificationResult {
	success: boolean;
	balance: string;
	tokenIds: string[];
	message: string;
}

export interface RegistrationCheck {
	isRegistered: boolean;
	registeredData?: unknown;
	mintPrice?: string;
	isActive?: boolean;
	error?: string;
}

export interface APIPayload {
	prompt: string;
	userAuthPayload: {
		userAddress: string;
		signature: string;
		message: string;
	};
	nftId: string;
}

export interface KnowledgeBasePayload {
	prompt: string;
	userAuthPayload: {
		userAddress: string;
		signature: string;
		message: string;
	};
	accountNFT: {
		collectionID: string;
		nftID: string;
	};
	agentCollection: {
		agentAddress: string;
		agentID?: string;
	};
}

// API Key Types
export interface ApiKeyData {
	apiKey: string;
	userAddress: string;
	nftId: string;
	timestamp: number;
	expiresAt?: number; // Optional for backward compatibility
}
