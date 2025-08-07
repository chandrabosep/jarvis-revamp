import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { SearchIcon } from "lucide-react";

interface SearchProps {
	placeholder?: string;
	className?: string;
	value: string;
	onChange: (value: string) => void;
	debounceTime?: number;
	onSearch?: (value: string) => void;
}

const SearchBar: React.FC<SearchProps> = ({
	placeholder = "Search...",
	className = "",
	value,
	onChange,
	debounceTime = 500,
	onSearch,
}) => {
	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const newValue = e.target.value;
			onChange(newValue);

			// If onSearch is provided and debounceTime > 0, use debouncing
			if (onSearch && debounceTime > 0) {
				const timer = setTimeout(() => {
					onSearch(newValue);
				}, debounceTime);

				// Cleanup timer on next change
				return () => clearTimeout(timer);
			} else if (onSearch) {
				// If no debounce, call immediately
				onSearch(newValue);
			}
		},
		[onChange, onSearch, debounceTime]
	);

	return (
		<div className={cn("w-full relative ml-auto rounded-md", className)}>
			<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground" />
			<Input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={handleChange}
				className="pl-10 h-10 bg-background border border-border rounded-md"
			/>
		</div>
	);
};

export default SearchBar;
