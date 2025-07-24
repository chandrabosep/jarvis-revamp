"use client";
import {
	Web3AuthProvider as Web3AuthModalProvider,
	useWeb3Auth as useWeb3AuthModal,
} from "@web3auth/modal-react-hooks";
import { web3AuthConfig } from "@/config/web3AuthConfig";
import {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
} from "react";
import { CHAIN_NAMESPACES, type IWeb3Auth } from "@web3auth/base";

interface ChainContextType {
	switchChain: () => Promise<void>;
}

const ChainContext = createContext<ChainContextType>({
	switchChain: async () => {},
});

export const useChainContext = () => useContext(ChainContext);

function ChainProvider({ children }: { children: ReactNode }) {
	const { provider, web3Auth } = useWeb3Auth();

	const switchChain = async () => {
		if (!web3Auth || !provider) return;

		try {
			const chainConfig = web3AuthConfig.chainConfig;
			const web3AuthInstance = web3Auth as IWeb3Auth;
			await web3AuthInstance.addChain({
				chainNamespace: CHAIN_NAMESPACES.EIP155,
				chainId: chainConfig.chainId,
				rpcTarget: chainConfig.rpcTarget,
				displayName: chainConfig.displayName,
				blockExplorerUrl: chainConfig.blockExplorerUrl,
				ticker: chainConfig.ticker,
				tickerName: chainConfig.tickerName,
			});
			await web3AuthInstance.switchChain({
				chainId: chainConfig.chainId,
			});
		} catch (error) {
			console.error("Error switching chain:", error);
		}
	};

	return (
		<ChainContext.Provider value={{ switchChain }}>
			{children}
		</ChainContext.Provider>
	);
}

// Create a context for Web3Auth state
const Web3AuthContext = createContext<Record<string, unknown> | null>(null);

// Safe wrapper component that always calls hooks in the same order
function Web3AuthWrapper({ children }: { children: ReactNode }) {
	const [isClient, setIsClient] = useState(false);

	// Always call the hook - this ensures consistent hook order
	const web3AuthResult = useWeb3AuthModal();

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Create fallback values for SSR
	const fallbackValue: Record<string, unknown> = {
		provider: null,
		web3Auth: null,
		connect: async () => {},
		logout: async () => {},
		login: async () => {},
		isConnected: false,
		user: null,
		chainId: null,
		address: null,
		balance: null,
	};

	// Use fallback during SSR or actual result on client
	const contextValue =
		!isClient || typeof window === "undefined"
			? fallbackValue
			: (web3AuthResult as unknown as Record<string, unknown>);

	return (
		<Web3AuthContext.Provider value={contextValue}>
			<ChainProvider>{children}</ChainProvider>
		</Web3AuthContext.Provider>
	);
}

// Create a simple hook that uses the context
export const useWeb3Auth = () => {
	const context = useContext(Web3AuthContext);
	if (!context) {
		throw new Error("useWeb3Auth must be used within a Web3AuthProvider");
	}
	return context as unknown as ReturnType<typeof useWeb3AuthModal>;
};

// Fallback provider for SSR
function FallbackWeb3AuthProvider({ children }: { children: ReactNode }) {
	const fallbackValue: Record<string, unknown> = {
		provider: null,
		web3Auth: null,
		connect: async () => {},
		logout: async () => {},
		login: async () => {},
		isConnected: false,
		user: null,
		chainId: null,
		address: null,
		balance: null,
	};

	return (
		<Web3AuthContext.Provider value={fallbackValue}>
			<ChainContext.Provider value={{ switchChain: async () => {} }}>
				{children}
			</ChainContext.Provider>
		</Web3AuthContext.Provider>
	);
}

export function Web3AuthProvider({ children }: { children: ReactNode }) {
	const [isClient, setIsClient] = useState(false);

	useEffect(() => {
		setIsClient(true);
	}, []);

	// During SSR, render fallback provider
	if (!isClient || typeof window === "undefined") {
		return <FallbackWeb3AuthProvider>{children}</FallbackWeb3AuthProvider>;
	}

	return (
		<Web3AuthModalProvider config={web3AuthConfig}>
			<Web3AuthWrapper>{children}</Web3AuthWrapper>
		</Web3AuthModalProvider>
	);
}
