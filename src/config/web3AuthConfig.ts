import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { Web3AuthOptions } from "@web3auth/modal";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";

export type ChainType = "mainnet";

interface ChainConfig {
	chainId: string;
	rpcTarget: string;
	displayName: string;
	blockExplorerUrl: string;
	ticker: string;
	tickerName: string;
}

import { NETWORK_CONFIG } from "./constants";

// Chain configuration for Skynet
const CHAIN_CONFIG: ChainConfig = {
	chainId: NETWORK_CONFIG.SKYNET.CHAIN_ID_HEX,
	rpcTarget: NETWORK_CONFIG.SKYNET.RPC_URL || "",
	displayName: NETWORK_CONFIG.SKYNET.DISPLAY_NAME,
	blockExplorerUrl: NETWORK_CONFIG.SKYNET.EXPLORER_URL || "",
	ticker: NETWORK_CONFIG.SKYNET.TICKER,
	tickerName: NETWORK_CONFIG.SKYNET.TICKER_NAME,
};

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID || "";

// EVM Chain Config
const chainConfig = {
	chainNamespace: CHAIN_NAMESPACES.EIP155,
	...CHAIN_CONFIG,
};

// Web3Auth Options with adapter settings to prevent MetaMask conflicts
const web3AuthOptions: Web3AuthOptions = {
	clientId: clientId || "", // Fallback client ID
	web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
	chainConfig,
	privateKeyProvider: new EthereumPrivateKeyProvider({
		config: { chainConfig },
	}),
	// Add adapter settings to prevent conflicts with MetaMask
	adapterSettings: {
		// Disable automatic provider injection to prevent conflicts
		enableLogging: false,
		// Use a custom provider name to avoid conflicts
		providerName: "Web3Auth",
	},
	// Disable automatic chain switching to prevent conflicts
	enableLogging: false,
	// Add session management to prevent provider conflicts
	sessionTime: 24 * 60 * 60, // 24 hours
};

export const web3AuthConfig = {
	web3AuthOptions,
	clientId,
	chainConfig,
};
