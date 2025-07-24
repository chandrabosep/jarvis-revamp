import axiosInstance from "@/lib/axios";
import { Agent } from "@/types/agents";

export const createAgent = async (agent: Agent) => {
	try {
		const { id, ...agentWithoutId } = agent;

		const agentPayload = {
			...agentWithoutId,
			...(id && { id }),
		};

		const response = await axiosInstance.post("/agents", agentPayload);
		return response.data;
	} catch (error) {
		console.error("Error creating/updating agent:", error);
		throw error;
	}
};

export const deleteAgent = async (id: string) => {
	try {
		const response = await axiosInstance.delete(`/agents/${id}`);
		return response.data;
	} catch (error) {
		console.error("Error deleting agent:", error);
		throw error;
	}
};
