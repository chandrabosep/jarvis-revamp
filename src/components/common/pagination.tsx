"use client";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../ui/button";

interface PaginationProps {
	maxPages: number;
	currentLocation?: string;
	total: number;
}

const DataPagination: React.FC<PaginationProps> = ({
	maxPages,
	currentLocation,
	total,
}) => {
	const router = useRouter();
	const searchParams = useSearchParams();
	const currentPage = searchParams.get("page") || "1";

	const usePreviousSearchParams = ({
		newSearchParams,
	}: {
		newSearchParams: URLSearchParams;
	}) => {
		for (const [key, value] of searchParams.entries()) {
			if (value) {
				newSearchParams.set(key, value);
			}
		}
	};

	const handlePreviousPage = () => {
		const newSearchParams = new URLSearchParams();
		usePreviousSearchParams({ newSearchParams });
		newSearchParams.set("page", (parseInt(currentPage) - 1).toString());
		const newUrl = `${
			currentLocation || "/history"
		}?${newSearchParams.toString()}`;
		router.push(newUrl);
	};

	const handleNextPage = () => {
		const newSearchParams = new URLSearchParams();
		usePreviousSearchParams({ newSearchParams });
		newSearchParams.set("page", (parseInt(currentPage) + 1).toString());
		const newUrl = `${
			currentLocation || "/history"
		}?${newSearchParams.toString()}`;
		router.push(newUrl);
	};

	const handlePageClick = (pageNumber: number) => {
		const newSearchParams = new URLSearchParams();
		usePreviousSearchParams({ newSearchParams });
		newSearchParams.set("page", pageNumber.toString());
		const newUrl = `${
			currentLocation || "/history"
		}?${newSearchParams.toString()}`;
		router.push(newUrl);
	};

	// Calculate correct item ranges (starting from 1, not 0)
	const itemsPerPage = 10;
	const currentPageNumber = parseInt(currentPage);
	const startItem = (currentPageNumber - 1) * itemsPerPage + 1;
	const endItem = Math.min(currentPageNumber * itemsPerPage, total);

	// Calculate which page buttons to show
	const getPageButtons = () => {
		// Define a type that can be a number or a special value for ellipsis
		type PageItem = number | "ellipsis";

		if (maxPages <= 10) {
			// Show all pages if 10 or fewer
			return Array.from(
				{ length: maxPages },
				(_, i) => i + 1
			) as PageItem[];
		} else {
			// Complex pagination with ellipsis
			let pages: PageItem[] = [1, 2, 3, 4];

			// Add middle section based on current page
			if (currentPageNumber > 4 && currentPageNumber < maxPages - 3) {
				pages = [
					1,
					"ellipsis",
					currentPageNumber - 1,
					currentPageNumber,
					currentPageNumber + 1,
					"ellipsis",
					maxPages,
				];
			} else if (currentPageNumber <= 4) {
				pages = [1, 2, 3, 4, 5, "ellipsis", maxPages];
			} else {
				pages = [
					1,
					"ellipsis",
					maxPages - 4,
					maxPages - 3,
					maxPages - 2,
					maxPages - 1,
					maxPages,
				];
			}

			return pages;
		}
	};

	const pageButtons = getPageButtons();

	return (
		<footer className="flex flex-1 select-none items-center justify-between mt-4 mr-7">
			<div className="text-sm ml-4">
				{total > 0
					? `Showing ${startItem} to ${endItem} of ${total}`
					: "No items to display"}
			</div>
			<div className="flex items-center">
				<Button
					disabled={currentPageNumber === 1}
					type="button"
					onClick={handlePreviousPage}
					variant="outline"
					className={cn(
						"h-8 min-w-8 rounded-l border-r-0",
						currentPageNumber === 1
							? "bg-gray-800 text-gray-400 border-gray-700"
							: "bg-gray-900 text-gray-200 border-gray-700 hover:bg-primaryColor hover:text-white"
					)}
				>
					<ChevronLeft className="size-3" />
				</Button>

				{pageButtons.map((page, index) =>
					page === "ellipsis" ? (
						<span
							key={`ellipsis-${index}`}
							className="py-1 px-2 min-w-8 text-sm text-center flex items-center justify-center text-gray-400"
						>
							...
						</span>
					) : (
						<Button
							key={`page-${page}`}
							type="button"
							variant={currentPageNumber === page ? "default" : "outline"}
							onClick={() => handlePageClick(page)}
							className={cn(
								"h-8 min-w-8 px-2 py-1 border-x-0 rounded-none text-sm",
								currentPageNumber === page
									? "bg-primaryColor text-white"
									: "bg-gray-900 text-gray-200 hover:bg-primaryColor hover:text-white"
							)}
							aria-current={currentPageNumber === page ? "page" : undefined}
						>
							{page}
						</Button>
					)
				)}

				<Button
					disabled={currentPageNumber >= maxPages}
					type="button"
					onClick={handleNextPage}
					variant="outline"
					className={cn(
						"h-8 min-w-8 rounded-r border-l-0",
						currentPageNumber >= maxPages
							? "bg-gray-800 text-gray-400 border-gray-700"
							: "bg-gray-900 text-gray-200 border-gray-700 hover:bg-primaryColor hover:text-white"
					)}
				>
					<ChevronRight className="size-3" />
				</Button>
			</div>
		</footer>
	);
};

export default DataPagination;
