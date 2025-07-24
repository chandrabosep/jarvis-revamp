import axiosInstance from "@/lib/axios";
import { AgentDetailResponse, AgentResponse } from "@/types/agents";

export const getAgents = async (params?: {
	search?: string;
	limit?: number;
	offset?: number;
}): Promise<AgentResponse> => {
	const response = await axiosInstance.get("/agents", {
		params: {
			search: params?.search,
			limit: params?.limit || 10,
			offset: params?.offset || 0,
		},
	});
	return response.data;
};

export const getUserAgents = async (params?: {
	search?: string;
	limit?: number;
	offset?: number;
	address: string;
}): Promise<AgentResponse> => {
	const response = await axiosInstance.get("/agents", {
		params: {
			search: params?.search,
			limit: params?.limit || 10,
			offset: params?.offset || 0,
			user_address: params?.address,
		},
	});
	return response.data;
};

export const getAgentById = async (
	id: string
): Promise<AgentDetailResponse> => {
	const response = await axiosInstance.get(`/agents/${id}`);
	return response.data;
};
