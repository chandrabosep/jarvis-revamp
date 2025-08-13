import React from "react";
import { Skeleton } from "../ui/skeleton";

export default function ChatSkeleton() {
	return (
		<div className="relative w-full max-w-7xl mx-auto h-full flex flex-col">
			<div className="">
				<Skeleton className="h-28 w-full rounded py-3 mb-4" />
				<div className=" py-3 rounded-md space-y-2">
					<Skeleton className="h-4 w-20" />
					<Skeleton className="h-4 w-16" />
					<Skeleton className="h-20 w-full" />
					<div className="flex items-center space-x-2 mt-2">
						<Skeleton className="h-4 w-20 rounded" />
						<Skeleton className="h-4 w-12" />
					</div>
				</div>

				<div className="py-3 rounded-md space-y-2">
					<Skeleton className="h-4 w-36" />
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-20 w-full" />
					<div className="flex items-center space-x-2 mt-2">
						<Skeleton className="h-4 w-20 rounded" />
						<Skeleton className="h-4 w-12" />
					</div>
				</div>

				<div className="mt-8">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-24 w-full mt-1.5" />
				</div>
			</div>
		</div>
	);
}
