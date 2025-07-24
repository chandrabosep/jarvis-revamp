import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3AuthProvider } from "@/providers/Web3AuthProvider";
import { Toaster } from "sonner";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: "Web3 NFT Agent Boilerplate",
	description:
		"A foundational Next.js application for Web3 development with NFT minting and agent management",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<Web3AuthProvider>
					<div className="min-h-screen bg-background">
						<header className="border-b">
							<div className="container mx-auto px-4 py-4">
								<nav className="flex items-center justify-between">
									<Link
										href="/"
										className="text-xl font-bold"
									>
										Web3 NFT Boilerplate
									</Link>
								</nav>
							</div>
						</header>
						<main>{children}</main>
					</div>
					<Toaster />
				</Web3AuthProvider>
			</body>
		</html>
	);
}
