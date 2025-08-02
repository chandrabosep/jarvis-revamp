"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useNft } from "@/hooks/use-nft";
import {
	mintAgentNft,
	checkAgentNFTOwnership,
	getUserAgentNFTIds,
} from "@/utils/skynetHelper";
import { toast } from "sonner";
import Link from "next/link";
import { getAgents, getAgentById } from "@/controllers/agents";
import { AgentDetail } from "@/types";

export default function AgentsPage() {
	const { isConnected, skyBrowser, address } = useWallet();
	const { hasNfts } = useNft();
	const [agents, setAgents] = useState<AgentDetail[]>([]);
	const [selectedAgentId, setSelectedAgentId] = useState<string>("");
	const [selectedAgentDetails, setSelectedAgentDetails] =
		useState<AgentDetail | null>(null);
	const [loading, setLoading] = useState(false);
	const [minting, setMinting] = useState(false);
	const [checkingOwnership, setCheckingOwnership] = useState(false);
	const [agentNFTOwnership, setAgentNFTOwnership] = useState<
		Record<string, boolean>
	>({});
	const [userAgentNFTIds, setUserAgentNFTIds] = useState<
		Record<string, string[]>
	>({});
	const [selectedAgentNFTId, setSelectedAgentNFTId] = useState<string>("");

	// Fetch agents from controller
	const handleFetchAgents = async () => {
		if (!isConnected) return;
		setLoading(true);
		try {
			const data = await getAgents();
			// Cast the agents to AgentDetail type
			setAgents(data.data.agents as AgentDetail[]);
		} catch (error) {
			console.error("Error fetching agents:", error);
			toast.error("Failed to fetch agents");
		} finally {
			setLoading(false);
		}
	};

	// Check if user owns NFT for a specific agent and get their NFT IDs
	const checkAgentNFT = async (agentAddress: string) => {
		if (!skyBrowser || !address || !agentAddress) return false;

		setCheckingOwnership(true);
		try {
			const ownsNFT = await checkAgentNFTOwnership(
				agentAddress,
				address,
				skyBrowser
			);
			setAgentNFTOwnership((prev) => ({
				...prev,
				[agentAddress]: ownsNFT,
			}));

			// If user owns NFTs, get all their NFT IDs
			if (ownsNFT) {
				const nftIds = await getUserAgentNFTIds(
					agentAddress,
					address,
					skyBrowser
				);
				setUserAgentNFTIds((prev) => ({
					...prev,
					[agentAddress]: nftIds,
				}));

				// Auto-select the first NFT if none is selected
				if (nftIds.length > 0 && !selectedAgentNFTId) {
					setSelectedAgentNFTId(nftIds[0]);
				}
			} else {
				// Clear NFT IDs if user doesn't own any
				setUserAgentNFTIds((prev) => ({
					...prev,
					[agentAddress]: [],
				}));
				setSelectedAgentNFTId("");
			}

			return ownsNFT;
		} catch (error) {
			console.error("Error checking agent NFT ownership:", error);
			return false;
		} finally {
			setCheckingOwnership(false);
		}
	};

	// Fetch agent details by ID from controller
	const handleFetchAgentById = async (agentId: string) => {
		if (!agentId) return;
		try {
			const data = await getAgentById(agentId);
			// Use the fresh data from the API response and cast to include is_deployed
			const agentDetails = data.data as AgentDetail;
			setSelectedAgentDetails(agentDetails);

			// Check if user owns NFT for this agent
			if (agentDetails.nft_address) {
				await checkAgentNFT(agentDetails.nft_address);
			}
		} catch (error) {
			console.error("Error fetching agent details:", error);
			toast.error("Failed to fetch agent details");
		}
	};

	// Handle agent selection
	const handleAgentSelect = (agentId: string) => {
		setSelectedAgentId(agentId);
		handleFetchAgentById(agentId);
	};

	// Mint agent NFT
	const handleMintAgentNft = async () => {
		if (!selectedAgentDetails || !skyBrowser) {
			toast.error(
				"Please select a deployed agent and ensure wallet is connected"
			);
			return;
		}

		if (!selectedAgentDetails.is_deployed) {
			toast.error("Only deployed agents can have NFTs minted");
			return;
		}

		setMinting(true);
		try {
			const result = await mintAgentNft(
				skyBrowser,
				selectedAgentDetails as AgentDetail
			);

			if (result) {
				toast.success("Agent NFT minted successfully!");
				// Update ownership status and refresh NFT IDs after successful mint
				if (selectedAgentDetails.nft_address) {
					setAgentNFTOwnership((prev) => ({
						...prev,
						[selectedAgentDetails.nft_address]: true,
					}));

					// Refresh the NFT IDs for this agent
					await checkAgentNFT(selectedAgentDetails.nft_address);
				}
				setSelectedAgentId("");
				setSelectedAgentDetails(null);
			} else {
				toast.error("Failed to mint agent NFT");
			}
		} catch (error) {
			console.error("Error minting agent NFT:", error);
			toast.error("Failed to mint agent NFT");
		} finally {
			setMinting(false);
		}
	};

	// Load agents on component mount
	useEffect(() => {
		if (isConnected) {
			handleFetchAgents();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConnected]);

	if (!isConnected) {
		return (
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-2xl font-bold mb-4">Agent NFT Minting</h1>
				<p className="text-muted-foreground mb-4">
					Connect your wallet to view and mint agent NFTs
				</p>
			</div>
		);
	}

	if (!hasNfts) {
		return (
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-2xl font-bold mb-4">Agent NFT Minting</h1>
				<p className="text-muted-foreground mb-4">
					You need to mint an account NFT before minting agent NFTs
				</p>
				<Button asChild>
					<Link href="/">Go Back to Mint Account NFT</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-2xl font-bold mb-6">Agent NFT Minting</h1>

			<div className="space-y-6">
				{/* Agent Selection */}
				<div className="border rounded-lg p-4">
					<h2 className="text-lg font-semibold mb-4">Select Agent</h2>

					{loading ? (
						<p className="text-muted-foreground">
							Loading agents...
						</p>
					) : (
						<div className="space-y-4">
							<select
								value={selectedAgentId}
								onChange={(e) =>
									handleAgentSelect(e.target.value)
								}
								className="w-full p-2 border rounded"
							>
								<option value="">Select an agent...</option>
								{agents.map((agent) => (
									<option key={agent.id} value={agent.id}>
										{agent.name}{" "}
										{agent.is_deployed
											? "(Deployed)"
											: "(Not Deployed)"}
									</option>
								))}
							</select>

							{agents.length === 0 && (
								<p className="text-muted-foreground">
									No agents found
								</p>
							)}
						</div>
					)}
				</div>

				{/* Agent Details */}
				{selectedAgentDetails && (
					<div className="border rounded-lg p-4">
						<h2 className="text-lg font-semibold mb-4">
							Agent Details
						</h2>
						<div className="space-y-2 text-sm">
							<div>
								<span className="font-medium">Name:</span>{" "}
								{selectedAgentDetails.name}
							</div>
							<div>
								<span className="font-medium">
									Description:
								</span>{" "}
								{selectedAgentDetails.description}
							</div>
							<div>
								<span className="font-medium">
									NFT Address:
								</span>{" "}
								{selectedAgentDetails.nft_address}
							</div>
							<div>
								<span className="font-medium">Status:</span>{" "}
								{selectedAgentDetails.is_deployed ? (
									<span className="text-green-600">
										Deployed
									</span>
								) : (
									<span className="text-red-600">
										Not Deployed
									</span>
								)}
							</div>
						</div>

						{selectedAgentDetails.is_deployed && (
							<div className="mt-4">
								{checkingOwnership ? (
									<div className="p-3 bg-blue-50 border border-blue-200 rounded">
										<p className="text-sm text-blue-800">
											Checking NFT ownership...
										</p>
									</div>
								) : selectedAgentDetails.nft_address &&
								  agentNFTOwnership[
										selectedAgentDetails.nft_address
								  ] ? (
									<div className="space-y-4">
										<div className="p-3 bg-green-50 border border-green-200 rounded">
											<p className="text-sm text-green-800">
												✅ You own{" "}
												{userAgentNFTIds[
													selectedAgentDetails
														.nft_address
												]?.length || 0}{" "}
												NFT(s) from this agent
												collection
											</p>
										</div>

										{userAgentNFTIds[
											selectedAgentDetails.nft_address
										] &&
											userAgentNFTIds[
												selectedAgentDetails.nft_address
											].length > 0 && (
												<div className="space-y-2">
													<label className="text-sm font-medium">
														Select your NFT:
													</label>
													<select
														value={
															selectedAgentNFTId
														}
														onChange={(e) =>
															setSelectedAgentNFTId(
																e.target.value
															)
														}
														className="w-full p-2 border rounded text-sm"
													>
														{userAgentNFTIds[
															selectedAgentDetails
																.nft_address
														].map((nftId) => (
															<option
																key={nftId}
																value={nftId}
															>
																NFT #{nftId}
															</option>
														))}
													</select>
													{selectedAgentNFTId && (
														<div className="p-2 bg-gray-50 border rounded text-xs">
															<span className="font-medium">
																Selected:
															</span>{" "}
															NFT #
															{selectedAgentNFTId}
														</div>
													)}
												</div>
											)}
									</div>
								) : (
									<Button
										onClick={handleMintAgentNft}
										disabled={minting}
										className="w-full"
									>
										{minting
											? "Minting Agent NFT..."
											: "Mint Agent NFT"}
									</Button>
								)}
							</div>
						)}

						{!selectedAgentDetails.is_deployed && (
							<div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
								<p className="text-sm text-yellow-800">
									This agent is not deployed yet. Only
									deployed agents can have NFTs minted.
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
