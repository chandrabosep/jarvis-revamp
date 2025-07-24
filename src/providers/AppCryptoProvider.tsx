"use client";
import {
	ReactNode,
	createContext,
	useContext,
	useEffect,
	useState,
	useCallback,
} from "react";
import { ethers } from "ethers";
import SkyMainBrowser from "@decloudlabs/skynet/lib/services/SkyMainBrowser";
import { toast } from "sonner";
import { useWeb3Auth } from "@/providers/Web3AuthProvider";
import { NETWORK_CONFIG } from "@/config/constants";
import { initializeSkynet } from "@/utils/skynetHelper";
import { CONNECT_STATES, Web3Context } from "./Web3ContextProvider";

interface AppCryptoConfig {
	skyBrowser: SkyMainBrowser | null;
	initAppCrypto: ((address: string) => Promise<void>) | null;
}

export const AppCryptoContext = createContext<AppCryptoConfig>({
	skyBrowser: null,
	initAppCrypto: null,
});

interface Props {
	children: ReactNode;
}

export function AppCryptoContextProvider({ children }: Props) {
	const [skyBrowser, setSkyBrowser] = useState<SkyMainBrowser | null>(null);
	const web3Context = useContext(Web3Context);
	const { provider } = useWeb3Auth();

	const initAppCrypto = useCallback(async () => {
		try {
			console.log("initAppCrypto - starting initialization");

			if (!provider) {
				throw new Error("No provider available for initialization");
			}

			const ethersProvider = new ethers.BrowserProvider(provider);
			const signer = await ethersProvider.getSigner();
			const selectedAccount = signer.address;
			console.log("selectedAccount", selectedAccount);

			// Use the skynet helper for initialization
			const skyMainBrowser = await initializeSkynet(provider, signer);

			console.log("SkyMainBrowser initialized successfully:", {
				account: skyMainBrowser.contractService.selectedAccount,
				chainId: NETWORK_CONFIG.SKYNET.CHAIN_ID,
			});

			setSkyBrowser(skyMainBrowser);
			toast.success("Wallet connected successfully!", {
				position: "top-right",
			});
		} catch (err: unknown) {
			const error: Error = err as Error;
			console.error("AppCrypto initialization error:", error);

			let errorMessage = "Failed to initialize wallet connection";

			if (error.message.includes("user rejected")) {
				errorMessage = "Connection was rejected. Please try again.";
			} else if (error.message.includes("network")) {
				errorMessage =
					"Network error. Please check your connection and try again.";
			} else if (error.message.includes("Chain")) {
				errorMessage = `Please switch to the ${NETWORK_CONFIG.SKYNET.DISPLAY_NAME} network.`;
			}

			toast.error(errorMessage, {
				position: "top-right",
			});
		}
	}, [provider]);

	useEffect(() => {
		if (
			web3Context.status !== CONNECT_STATES.CONNECTED ||
			!provider ||
			!("address" in web3Context)
		)
			return;
		initAppCrypto();
	}, [web3Context, provider, initAppCrypto]);

	return (
		<AppCryptoContext.Provider value={{ skyBrowser, initAppCrypto }}>
			{children}
		</AppCryptoContext.Provider>
	);
}
