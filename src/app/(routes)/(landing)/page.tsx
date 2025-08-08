"use client";
import React from "react";
import ConnectButton from "@/components/wallet/connect-button";
import { useWallet } from "@/hooks/use-wallet";
import { useRouter } from "next/navigation";

export default function page() {
	const router = useRouter();
	const { isConnected } = useWallet();
	if (isConnected) {
		router.replace("/create");
	}
	return (
		<div className="flex flex-col items-center justify-center h-screen bg-black">
			<ConnectButton />
		</div>
	);
}
