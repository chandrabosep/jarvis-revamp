import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3AuthProvider } from "@/providers/Web3AuthProvider";
import { Toaster } from "sonner";
import { APP_CONFIG } from "@/config/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
	title: APP_CONFIG.NAME,
	description: APP_CONFIG.DESCRIPTION,
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
						<main>{children}</main>
					</div>
					<Toaster />
				</Web3AuthProvider>
			</body>
		</html>
	);
}
