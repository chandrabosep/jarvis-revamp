// Network Configuration
export const NETWORK_CONFIG = {
	SKYNET: {
		CHAIN_ID: 619,
		CHAIN_ID_HEX: "0x26B",
		RPC_URL: "https://rpc.skynet.io",
		EXPLORER_URL: "https://explorer.skynet.io",
		TICKER: "sUSD",
		TICKER_NAME: "sUSD",
		DISPLAY_NAME: "Skynet",
	},
} as const;

// API Configuration
export const API_CONFIG = {
	STORAGE_API: process.env.NEXT_PUBLIC_STORAGE_API_URL,
	SKYINTEL_API: process.env.NEXT_PUBLIC_SKYINTEL_API_URL,
	BATCH_SIZE: 20,
	MAX_RETRIES: 3,
	RETRY_DELAY: 2000,
} as const;
