import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AgentCardProps {
	name: string;
	description: string;
	owned?: boolean;
	isSelected?: boolean;
	onMint?: () => void;
	onSelect?: () => void;
	minting?: boolean;
	checkingOwnership?: boolean;
}

export default function AgentCard({
	name,
	description,
	owned = false,
	isSelected = false,
	onMint,
	onSelect,
	minting = false,
	checkingOwnership = false,
}: AgentCardProps) {
	return (
		<div
			className={`rounded-lg p-4 flex flex-col gap-1 shadow-sm transition-colors ${
				isSelected ? "bg-accent/20 border-[1.5px] border-accent" : "bg-muted"
			}`}
		>
			<div className="flex items-center gap-2 mb-1">
				<span className="font-semibold text-base text-foreground">
					{name}
				</span>
				{owned && (
					<Badge className="!text-[10px] px-1 py-[1px] text-black bg-green-500">
						OWNED
					</Badge>
				)}
			</div>
			<div className="flex flex-col gap-y-4 h-full">
				<div className="flex items-center justify-between">
					<div className="text-muted-foreground text-sm line-clamp-3">
						{description}
					</div>
				</div>
				<div className="flex justify-end mt-auto w-full">
					{!owned ? (
						<Button
							size="sm"
							onClick={onMint}
							disabled={minting || checkingOwnership}
							className="bg-accent hover:bg-accent/80 text-white"
						>
							{minting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Minting...
								</>
							) : (
								"Mint"
							)}
						</Button>
					) : (
						<Button
							size="sm"
							onClick={onSelect}
							variant={"outline"}
							className={`${
								isSelected
									? "bg-accent text-accent-foreground border-accent hover:bg-accent/90"
									: "bg-border/70 hover:bg-border hover:text-white text-icon"
							}`}
						>
							{isSelected ? "Selected" : "Select"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
