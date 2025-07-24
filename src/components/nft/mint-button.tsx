"use client";
import { Button } from "@/components/ui/button";
import { useNft } from "@/hooks/use-nft";
import { useWallet } from "@/hooks/use-wallet";
import { toast } from "sonner";

export default function MintButton() {
	const { isConnected } = useWallet();
	const { hasNfts, minting, mintNft } = useNft();

	const handleMint = async () => {
		if (!isConnected) {
			toast.error("Please connect your wallet first");
			return;
		}

		const result = await mintNft();

		if (result.success) {
			toast.success("NFT minted successfully!");
		} else {
			toast.error(result.message || "Failed to mint NFT");
		}
	};

	if (hasNfts) {
		return null; // Don't show if user already has NFTs
	}

	return (
		<Button
			onClick={handleMint}
			disabled={!isConnected || minting}
			className="w-full"
		>
			{minting ? "Minting..." : "Mint Account NFT"}
		</Button>
	);
}
