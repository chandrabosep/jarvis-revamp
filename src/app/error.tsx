"use client";

import { useEffect } from "react";

export default function Error({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		// Log the error to an error reporting service
		console.error("Application error:", error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-background">
			<div className="text-center space-y-4">
				<h2 className="text-2xl font-bold text-foreground">
					Something went wrong!
				</h2>
				<p className="text-muted-foreground">
					We encountered an unexpected error. Please try refreshing
					the page.
				</p>
				<button
					onClick={reset}
					className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
				>
					Try again
				</button>
			</div>
		</div>
	);
}
