"use client";

import React from "react";
import { Toaster } from "sonner";
import { Web3AuthProvider } from "./Web3AuthProvider";
import Web3ContextProvider from "./Web3ContextProvider";
import { AppCryptoContextProvider } from "./AppCryptoProvider";

interface ClientProvidersProps {
	children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
	return (
		<Web3AuthProvider>
			<Web3ContextProvider>
				<AppCryptoContextProvider>
					{children}
					<Toaster position="top-right" />
				</AppCryptoContextProvider>
			</Web3ContextProvider>
		</Web3AuthProvider>
	);
}
