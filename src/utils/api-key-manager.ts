import axios from "axios";
import { getAuthWithRetry, ensureUserHasNFT } from "./skynetHelper";
import { API_KEY_CONFIG } from "@/config/constants";

export class ApiKeyManager {
	private static instance: ApiKeyManager;
	private cachedApiKey: string | null = null;

	public static getInstance(): ApiKeyManager {
		if (!ApiKeyManager.instance) {
			ApiKeyManager.instance = new ApiKeyManager();
		}
		return ApiKeyManager.instance;
	}

	public async getApiKey(skyBrowser: any, web3Context: any): Promise<string> {
		if (this.cachedApiKey) {
			return this.cachedApiKey;
		}

		const storedApiKeyData = this.getStoredApiKeyData();
		if (storedApiKeyData && this.isApiKeyValid(storedApiKeyData)) {
			this.cachedApiKey = storedApiKeyData.apiKey;
			return storedApiKeyData.apiKey;
		}

		const newApiKey = await this.generateNewApiKey(skyBrowser, web3Context);
		this.cachedApiKey = newApiKey;
		return newApiKey;
	}

	private async generateNewApiKey(
		skyBrowser: any,
		web3Context: any
	): Promise<string> {
		try {
			const auth = await getAuthWithRetry(skyBrowser);
			const nftResult = await ensureUserHasNFT(skyBrowser, web3Context);

			if (!nftResult.success) {
				throw new Error(
					nftResult.message ||
						"Failed to get NFT for API key generation"
				);
			}

			const response = await axios.post(API_KEY_CONFIG.GENERATION_URL, {
				userAuthPayload: JSON.stringify(auth.data),
				accountNFT: JSON.stringify({
					collectionID: "0",
					nftID: nftResult.nftId,
				}),
			});

			const apiKey = response.data.data.apiKey;

			this.storeApiKeyData({
				apiKey,
				userAddress: auth.data.userAddress,
				nftId: nftResult.nftId,
				timestamp: Date.now(),
			});

			return apiKey;
		} catch (error) {
			console.error("Error generating API key:", error);
			throw new Error("Failed to generate API key");
		}
	}

	private getStoredApiKeyData(): any {
		try {
			const stored = localStorage.getItem(API_KEY_CONFIG.STORAGE_KEY);
			return stored ? JSON.parse(stored) : null;
		} catch {
			return null;
		}
	}

	private isApiKeyValid(data: any): boolean {
		return Date.now() - data.timestamp < API_KEY_CONFIG.VALIDITY_DURATION;
	}

	private storeApiKeyData(data: any): void {
		try {
			localStorage.setItem(
				API_KEY_CONFIG.STORAGE_KEY,
				JSON.stringify(data)
			);
		} catch (error) {
			console.error("Failed to store API key data:", error);
		}
	}

	public clearCache(): void {
		this.cachedApiKey = null;
		localStorage.removeItem(API_KEY_CONFIG.STORAGE_KEY);
	}
}

export const apiKeyManager = ApiKeyManager.getInstance();
