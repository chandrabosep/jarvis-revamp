export default function Loading() {
	return (
		<div className="flex items-center justify-center min-h-screen bg-background">
			<div className="text-center space-y-4">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
				<p className="text-muted-foreground">Loading...</p>
			</div>
		</div>
	);
}
