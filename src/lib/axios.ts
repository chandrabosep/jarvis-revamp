import axios from "axios";
import { apiKeyManager } from "@/utils/api-key-manager";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { Web3Context } from "@/types/wallet";

const axiosInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
	headers: {
		"Content-Type": "application/json",
	},
});

export const getAxiosInstanceWithApiKey = async (
	apiUrl: string,
	skyBrowser?: SkyMainBrowser,
	web3Context?: Web3Context
) => {
	if (skyBrowser && web3Context) {
		try {
			const apiKey = await apiKeyManager.getApiKey(
				skyBrowser,
				web3Context
			);
			return axios.create({
				baseURL: apiUrl,
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
				},
			});
		} catch (error) {
			console.warn("Failed to get API key for axios instance:", error);
		}
	}

	return axiosInstance;
};

// Request interceptor
axiosInstance.interceptors.request.use(
	(config) => {
		console.log(`Making request to: ${config.url}`);
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor
axiosInstance.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		console.error("API Error:", error.response?.data || error.message);
		return Promise.reject(error);
	}
);

export default axiosInstance;
