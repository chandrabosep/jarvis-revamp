export interface Agent {
	id: string;
	name: string;
	description: string;
	nft_address: string;
	collection_id: string;
	created_at: string;
	updated_at: string;
}

export interface AgentPagination {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}

export interface AgentResponse {
	success: boolean;
	data: {
		agents: Agent[];
		pagination: AgentPagination;
	};
	message: string;
}

export interface AgentDetailResponse {
	success: boolean;
	data: Agent;
	message: string;
}

export interface AgentErrorResponse {
	success: boolean;
	error: string;
}

export interface AgentNFT {
	tokenId: string;
	agentId: string;
	owner: string;
	metadata?: {
		name: string;
		description: string;
		image: string;
	};
}
