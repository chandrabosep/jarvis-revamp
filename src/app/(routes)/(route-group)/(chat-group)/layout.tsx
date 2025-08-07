import React from "react";

export default function layout({ children }: { children: React.ReactNode }) {
	return (
		<div className="h-full flex-1 w-10/12 max-w-7xl mx-auto">
			{children}
		</div>
	);
}
