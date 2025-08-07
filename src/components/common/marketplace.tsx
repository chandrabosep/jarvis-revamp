"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Loader2, Plus, XIcon } from "lucide-react";
import { StoreIcon } from "lucide-react";
import SearchBar from "./search";
import AgentCard from "./agent-card";
import { getAgents } from "@/controllers/agents";
import { Agent } from "@/types";

export default function Marketplace() {
	const [agents, setAgents] = useState<Agent[]>([]);
	const [loading, setLoading] = useState(false);
	const [search, setSearch] = useState("");
	const [error, setError] = useState<string | null>(null);
	const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

	const fetchAgents = useCallback(async (searchValue: string = "") => {
		setLoading(true);
		setError(null);
		try {
			const data = await getAgents({ search: searchValue, limit: 12 });
			setAgents(data?.data?.agents || []);
		} catch (e) {
			console.error("Error fetching agents:", e);
			setError("Failed to load agents. Please try again.");
			setAgents([]);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		fetchAgents();
	}, [fetchAgents]);

	const handleSearchChange = (value: string) => {
		setSearch(value);
	};

	const handleSearch = useCallback(
		(searchValue: string) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				fetchAgents(searchValue);
			}, 300);
		},
		[fetchAgents]
	);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	const handleAgentSelect = (agent: Agent) => {
		console.log("Selected agent:", agent);
	};

	const handleAgentMint = (agent: Agent) => {
		console.log("Mint agent:", agent);
	};

	return (
		<>
			<Dialog>
				<DialogTrigger asChild>
					<Button size="sm" className="w-fit cursor-pointer">
						<Plus />
					</Button>
				</DialogTrigger>
				<DialogContent className="!w-[92vw] !h-[90svh] !max-h-[900px] !max-w-6xl flex flex-col border-none ">
					<DialogHeader className="absolute top-0 left-0 w-full rounded-t-lg bg-background h-16 z-10 px-10 flex justify-center">
						<DialogTitle className="flex items-center gap-2">
							<StoreIcon />
							<h5 className="text-foreground ">Marketplace</h5>
						</DialogTitle>
						<DialogClose className="absolute right-10">
							<XIcon className="size-6" />
						</DialogClose>
					</DialogHeader>
					<div className="mt-7 px-4 w-full flex flex-col gap-y-4 relative flex-1 min-h-0">
						<div className="flex flex-col gap-y-4 h-full max-h-full mt-3 pt-5">
							<SearchBar
								value={search}
								onChange={handleSearchChange}
								onSearch={handleSearch}
								className="w-96 mx-auto"
								placeholder="Search agents..."
								debounceTime={300}
							/>
							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto scrollbar-thin pr-2">
								{loading ? (
									<div className="col-span-full flex justify-center items-center py-8">
										<Loader2 className="size-6 animate-spin text-muted-foreground" />
									</div>
								) : error ? (
									<div className="col-span-full text-center text-red-500 py-8">
										{error}
									</div>
								) : agents.length === 0 ? (
									<div className="col-span-full text-center text-muted-foreground py-8">
										{search
											? "No agents found matching your search."
											: "No agents available."}
									</div>
								) : (
									agents.map((agent: Agent) => (
										<AgentCard
											key={agent.id}
											name={agent.name}
											description={agent.description}
											owned={false}
											onSelect={() =>
												handleAgentSelect(agent)
											}
											onMint={() =>
												handleAgentMint(agent)
											}
										/>
									))
								)}
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
