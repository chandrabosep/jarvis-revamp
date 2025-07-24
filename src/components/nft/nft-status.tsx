"use client";
import { useNft } from "@/hooks/use-nft";
import { useWallet } from "@/hooks/use-wallet";

export default function NftStatus() {
	const { isConnected, address } = useWallet();
	const { nfts, hasNfts, loading } = useNft();

	if (!isConnected) {
		return (
			<div className="border rounded-lg p-4">
				<h3 className="font-semibold mb-2">Wallet Status</h3>
				<div className="text-sm text-red-600">Wallet not connected</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className="border rounded-lg p-4">
				<h3 className="font-semibold mb-2">NFT Status</h3>
				<div className="text-sm text-muted-foreground">
					Loading NFTs...
				</div>
			</div>
		);
	}

	return (
		<div className="border rounded-lg p-4">
			<h3 className="font-semibold mb-2">NFT Status</h3>
			<div className="space-y-2 text-sm">
				<div>
					<span className="font-medium">Account NFT:</span>{" "}
					{hasNfts ? (
						<span className="text-green-600">Owned</span>
					) : (
						<span className="text-red-600">Not Owned</span>
					)}
				</div>

				{hasNfts && nfts.length > 0 && (
					<div>
						<span className="font-medium">NFT IDs:</span>{" "}
						{nfts.slice(0, 3).map((nftId) => (
							<span
								key={nftId}
								className="bg-gray-100 px-1 rounded text-xs mr-1"
							>
								#{nftId.slice(-6)}
							</span>
						))}
						{nfts.length > 3 && (
							<span className="text-xs text-muted-foreground">
								+{nfts.length - 3} more
							</span>
						)}
					</div>
				)}

				{address && (
					<div>
						<span className="font-medium">Wallet:</span>{" "}
						<span className="font-mono text-xs">
							{address}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}
