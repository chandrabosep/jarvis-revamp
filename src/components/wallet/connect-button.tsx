"use client";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";

export default function ConnectButton() {
	const { isConnected, address, loading, connect, disconnect } = useWallet();

	if (loading) {
		return <Button disabled>Connecting...</Button>;
	}

	if (isConnected && address) {
		return (
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">
					{`${address.slice(0, 6)}...${address.slice(-4)}`}
				</span>
				<Button variant="outline" onClick={disconnect}>
					Disconnect
				</Button>
			</div>
		);
	}

	return <Button onClick={connect}>Connect Wallet</Button>;
}
