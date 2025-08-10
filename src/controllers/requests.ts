import { getAxiosInstanceWithApiKey } from "@/lib/axios";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { Web3Context } from "@/types/wallet";

export const getHistory = async (
	params?: {
		page?: number;
		limit?: number;
		agentId?: string;
		status?:
			| "in_progress"
			| "completed"
			| "pending"
			| "failed"
			| "stopped"
			| "waiting_response";
	},
	skyBrowser?: SkyMainBrowser,
	web3Context?: Web3Context
): Promise<any> => {
	const axiosInstance = await getAxiosInstanceWithApiKey(
		process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL || "",
		skyBrowser,
		web3Context
	);
	const response = await axiosInstance.get("/requests", {
		params: params || {},
	});
	return response.data;
};  
