import type { SafeEventEmitterProvider } from "@web3auth/base";
import { ethers } from "ethers";

export class Web3RPC {
    private provider: SafeEventEmitterProvider;

    constructor(provider: SafeEventEmitterProvider) {
        this.provider = provider;
    }
    getProvider(): SafeEventEmitterProvider {
        return this.provider;
    }

    async getAccounts(): Promise<string> {
        try {
            const ethersProvider = new ethers.BrowserProvider(this.provider);
            const signer = await ethersProvider.getSigner();
            const address = await signer.getAddress();
            return address;
        } catch (error) {
            console.error("Error getting accounts:", error);
            throw error;
        }
    }


    async getBalance(): Promise<string> {
        try {
            const ethersProvider = new ethers.BrowserProvider(this.provider);
            const signer = await ethersProvider.getSigner();
            const address = await signer.getAddress();
            const balance = await ethersProvider.getBalance(address);
            return ethers.formatEther(balance);
        } catch (error) {
            console.error("Error getting balance:", error);
            throw error;
        }
    }

    async signMessage(message: string): Promise<string> {
        try {
            const ethersProvider = new ethers.BrowserProvider(this.provider);
            const signer = await ethersProvider.getSigner();
            const signedMessage = await signer.signMessage(message);
            return signedMessage;
        } catch (error) {
            console.error("Error signing message:", error);
            throw error;
        }
    }

    async getChainId(): Promise<number> {
        try {
            const ethersProvider = new ethers.BrowserProvider(this.provider);
            const network = await ethersProvider.getNetwork();
            return Number(network.chainId);
        } catch (error) {
            console.error("Error getting chain ID:", error);
            throw error;
        }
    }
} 

