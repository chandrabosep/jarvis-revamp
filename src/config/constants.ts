// Network Configuration - Customize for your blockchain
export const NETWORK_CONFIG = {
	SKYNET: {
		CHAIN_ID: 619,
		CHAIN_ID_HEX: "0x26B",
		RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "https://rpc.skynet.io",
		EXPLORER_URL:
			process.env.NEXT_PUBLIC_EXPLORER_URL ||
			"https://explorer.skynet.io",
		TICKER: "sUSD",
		TICKER_NAME: "sUSD",
		DISPLAY_NAME: "Skynet",
	},
	// Add more networks as needed
	// ETHEREUM: {
	//   CHAIN_ID: 1,
	//   CHAIN_ID_HEX: "0x1",
	//   RPC_URL: "https://mainnet.infura.io/v3/YOUR_PROJECT_ID",
	//   EXPLORER_URL: "https://etherscan.io",
	//   TICKER: "ETH",
	//   TICKER_NAME: "Ethereum",
	//   DISPLAY_NAME: "Ethereum Mainnet",
	// },
} as const;

// API Configuration - Update with your API endpoints
export const API_CONFIG = {
	STORAGE_API: process.env.NEXT_PUBLIC_STORAGE_API_URL,
	SKYINTEL_API: process.env.NEXT_PUBLIC_SKYINTEL_API_URL,
	BATCH_SIZE: 20,
	MAX_RETRIES: 3,
	RETRY_DELAY: 2000,
} as const;

// App Configuration
export const APP_CONFIG = {
	NAME: "Skynet Boilerplate",
	DESCRIPTION: "A modern Web3 boilerplate for Skynet blockchain",
	VERSION: "1.0.0",
	SUPPORTED_NETWORKS: ["SKYNET"],
} as const;

// Feature Flags - Enable/disable features
export const FEATURE_FLAGS = {
	ENABLE_NFT_MINTING: true,
	ENABLE_AGENT_MANAGEMENT: true,
	ENABLE_WALLET_CONNECTION: true,
	ENABLE_REAL_TIME_UPDATES: true,
} as const;
