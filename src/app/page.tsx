import ConnectButton from "@/components/wallet/connect-button";
import MintButton from "@/components/nft/mint-button";
import NftStatus from "@/components/nft/nft-status";
import Link from "next/link";
import { APP_CONFIG } from "@/config/constants";

export default function HomePage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="max-w-4xl mx-auto">
				{/* Header */}
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						{APP_CONFIG.NAME}
					</h1>
					<p className="text-lg text-muted-foreground mb-6">
						{APP_CONFIG.DESCRIPTION}
					</p>
					<p className="text-sm text-muted-foreground mb-6">
						Ready-to-use Web3 application template with wallet
						authentication, NFT minting, and agent management
					</p>
					<ConnectButton />
				</div>

				{/* Features Grid */}
				<div className="grid md:grid-cols-3 gap-6 mb-8">
					<div className="border rounded-lg p-6 text-center">
						<div className="text-2xl mb-2">🔐</div>
						<h3 className="font-semibold mb-2">
							Wallet Authentication
						</h3>
						<p className="text-sm text-muted-foreground">
							Secure Web3Auth integration with multiple wallet
							providers
						</p>
					</div>
					<div className="border rounded-lg p-6 text-center">
						<div className="text-2xl mb-2">🎨</div>
						<h3 className="font-semibold mb-2">NFT Minting</h3>
						<p className="text-sm text-muted-foreground">
							Mint account and agent NFTs on the Skynet blockchain
						</p>
					</div>
					<div className="border rounded-lg p-6 text-center">
						<div className="text-2xl mb-2">🤖</div>
						<h3 className="font-semibold mb-2">
							Agent Minting & Running
						</h3>
						<p className="text-sm text-muted-foreground">
							Mint agent NFTs and run AI agents on-chain
						</p>
					</div>
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

				{/* Agent Management */}
				<div className="border rounded-lg p-6 mb-8">
					<h2 className="text-xl font-semibold mb-4">
						Agent Management
					</h2>
					<p className="text-sm text-muted-foreground mb-4">
						Select and execute AI agents, mint their NFTs, and
						monitor their performance
					</p>
					<Link href="/agents">
						<button className="w-full p-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
							Go to Agent Dashboard
						</button>
					</Link>
				</div>

				{/* Quick Start Guide */}
				<div className="border rounded-lg p-6 mb-8">
					<h2 className="text-xl font-semibold mb-4">
						🚀 Quick Start Guide
					</h2>
					<div className="space-y-3 text-sm">
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
								1
							</span>
							<span>Connect your wallet using Web3Auth</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
								2
							</span>
							<span>Mint an account NFT on Skynet network</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
								3
							</span>
							<span>Select and execute AI agents</span>
						</div>
						<div className="flex items-center gap-3">
							<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
								4
							</span>
							<span>
								Mint agent NFTs and explore the codebase
							</span>
						</div>
					</div>
				</div>

				{/* Technology Stack */}
				<div className="border rounded-lg p-6">
					<h2 className="text-xl font-semibold mb-4">
						🛠️ Technology Stack
					</h2>
					<div className="grid md:grid-cols-2 gap-4 text-sm">
						<div>
							<h3 className="font-medium mb-2">Frontend</h3>
							<ul className="space-y-1 text-muted-foreground">
								<li>• Next.js 15 with App Router</li>
								<li>• React 19 with TypeScript</li>
								<li>• Tailwind CSS + Shadcn/ui</li>
								<li>• Lucide React Icons</li>
							</ul>
						</div>
						<div>
							<h3 className="font-medium mb-2">
								Web3 & Blockchain
							</h3>
							<ul className="space-y-1 text-muted-foreground">
								<li>• Web3Auth for authentication</li>
								<li>• Ethers.js for blockchain interaction</li>
								<li>• Skynet SDK (@decloudlabs/skynet)</li>
								<li>• Real-time WebSocket updates</li>
							</ul>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
