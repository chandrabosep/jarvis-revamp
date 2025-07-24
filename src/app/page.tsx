import ConnectButton from "@/components/wallet/connect-button";
import MintButton from "@/components/nft/mint-button";
import NftStatus from "@/components/nft/nft-status";
import Link from "next/link";

export default function HomePage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				{/* Simple Header */}
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold mb-4">
						Web3 NFT Agent Boilerplate
					</h1>
					<p className="text-muted-foreground mb-6">
						Learn Web3 development with NFT minting and agent
						management
					</p>
					<ConnectButton />
				</div>

				{/* Core Functionality */}
				<div className="grid md:grid-cols-2 gap-6 mb-8">
					<NftStatus />
					<div className="space-y-4">
						<h2 className="text-xl font-semibold">Get Started</h2>
						<p className="text-sm text-muted-foreground">
							Mint your account NFT to begin using the platform
						</p>
						<MintButton />
					</div>
				</div>

				{/* Agent NFT Minting */}
				<div className="border rounded-lg p-6 mb-8">
					<h2 className="text-xl font-semibold mb-4">
						Agent NFT Minting
					</h2>
					<p className="text-sm text-muted-foreground mb-4">
						Select deployed agents and mint their NFTs
					</p>
					<Link href="/agents">
						<button className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700">
							Go to Agent NFT Minting
						</button>
					</Link>
				</div>

				{/* Simple Steps */}
				<div className="space-y-4">
					<h2 className="text-xl font-semibold">Learning Steps</h2>
					<div className="space-y-2 text-sm">
						<div>1. Connect your wallet using Web3Auth</div>
						<div>2. Mint an account NFT on Skynet network</div>
						<div>3. Select deployed agents and mint their NFTs</div>
						<div>
							4. Explore the codebase to understand Web3 patterns
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
