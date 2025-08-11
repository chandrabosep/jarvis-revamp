"use client";

import {
	type ColumnDef,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getHistory } from "@/controllers/requests";
import { useWallet } from "@/hooks/use-wallet";
import { HistoryItem } from "@/types";

const getStatusBadge = (status: string) => {
	const statusConfig = {
		completed: {
			label: "Completed",
			variant: "default" as const,
			className: "bg-green-100 text-green-800 hover:bg-green-100",
		},
		stopped: {
			label: "Failed",
			variant: "destructive" as const,
			className: "bg-red-100 text-red-800 hover:bg-red-100",
		},
		waiting_response: {
			label: "Warning",
			variant: "secondary" as const,
			className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
		},
		failed: {
			label: "Failed",
			variant: "destructive" as const,
			className: "bg-red-100 text-red-800 hover:bg-red-100",
		},
	};

	const config =
		statusConfig[status as keyof typeof statusConfig] ||
		statusConfig.failed;

	return (
		<Badge variant={config.variant} className={config.className}>
			{config.label}
		</Badge>
	);
};

const formatDuration = (createdAt: string, updatedAt: string) => {
	const created = new Date(createdAt);
	const updated = new Date(updatedAt);
	const diffMs = updated.getTime() - created.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (diffMinutes < 1) return "< 1 minute";
	if (diffMinutes === 1) return "1 minute";
	return `${diffMinutes} minutes`;
};

const formatLastUpdated = (updatedAt: string) => {
	const updated = new Date(updatedAt);
	const now = new Date();
	const diffMs = now.getTime() - updated.getTime();
	const diffMinutes = Math.floor(diffMs / (1000 * 60));

	if (diffMinutes < 1) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

	const diffHours = Math.floor(diffMinutes / 60);
	if (diffHours < 24) return `${diffHours} hours ago`;

	const diffDays = Math.floor(diffHours / 24);
	return `${diffDays} days ago`;
};

export default function WorkflowHistory() {
	// State management
	const [workflows, setWorkflows] = useState<HistoryItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [statusFilter, setStatusFilter] = useState<string[]>([]);
	const [page, setPage] = useState(0);
	const [pageSize, setPageSize] = useState(10);
	const [totalCount, setTotalCount] = useState(0);
	const [search, setSearch] = useState("");

	// Wallet hook
	const { skyBrowser, address } = useWallet();

	// Fetch history function
	const fetchHistory = useCallback(async () => {
		if (!skyBrowser || !address) {
			setWorkflows([]);
			setTotalCount(0);
			return;
		}

		try {
			setLoading(true);
			setError(null);

			const web3Context = { address };
			const response = await getHistory(
				{
					page: page + 1, // API uses 1-based indexing
					limit: pageSize,
					status:
						statusFilter.length > 0
							? (statusFilter[0] as
									| "in_progress"
									| "completed"
									| "pending"
									| "failed"
									| "stopped"
									| "waiting_response")
							: undefined,
				},
				skyBrowser,
				web3Context
			);

			// Handle the response format
			let newWorkflows: HistoryItem[] = [];
			let newTotalCount = 0;

			if (response.workflows && Array.isArray(response.workflows)) {
				newWorkflows = response.workflows;
				newTotalCount =
					response.totalCount || response.workflows.length;
			} else if (response.success && response.data?.requests) {
				newWorkflows = response.data.requests;
				newTotalCount =
					response.data.totalCount || response.data.requests.length;
			} else if (response.data?.requests) {
				newWorkflows = response.data.requests;
				newTotalCount =
					response.data.totalCount || response.data.requests.length;
			}

			setWorkflows(newWorkflows);
			setTotalCount(newTotalCount);
		} catch (err) {
			console.error("Failed to fetch history:", err);
			setError(
				err instanceof Error ? err.message : "Failed to fetch history"
			);
		} finally {
			setLoading(false);
		}
	}, [skyBrowser, address, page, pageSize, statusFilter]);

	// Fetch history when dependencies change
	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	// Filter workflows based on search
	const filteredWorkflows = React.useMemo(() => {
		if (!search.trim()) return workflows;

		return workflows.filter(
			(workflow) =>
				workflow.userPrompt
					?.toLowerCase()
					.includes(search.toLowerCase()) ||
				workflow.status?.toLowerCase().includes(search.toLowerCase())
		);
	}, [workflows, search]);

	const columns: ColumnDef<any>[] = [
		{
			accessorKey: "userPrompt",
			header: "Workflow",
			cell: ({ row }) => (
				<div className="max-w-[300px]">
					<span className="text-sm text-gray-300 truncate block">
						{row.original.userPrompt || "Untitled workflow"}
					</span>
				</div>
			),
		},
		{
			accessorKey: "status",
			header: "Status",
			cell: ({ row }) => getStatusBadge(row.original.status),
			filterFn: (row, id, value) => {
				if (!value || value.length === 0) return true;
				return value.includes(row.getValue(id));
			},
		},
		{
			accessorKey: "updatedAt",
			header: "Last Updated",
			cell: ({ row }) => (
				<span className="text-sm text-gray-400">
					{formatLastUpdated(row.original.updatedAt)}
				</span>
			),
		},
		{
			accessorKey: "duration",
			header: "Duration",
			cell: ({ row }) => (
				<span className="text-sm text-gray-400">
					{formatDuration(
						row.original.createdAt,
						row.original.updatedAt
					)}
				</span>
			),
		},
	];

	const hasActiveFilters = statusFilter.length > 0;

	const table = useReactTable({
		data: filteredWorkflows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		state: {
			pagination: {
				pageIndex: page,
				pageSize: pageSize,
			},
		},
		manualPagination: true,
		pageCount: Math.ceil(filteredWorkflows.length / pageSize),
		manualFiltering: true,
		enableGlobalFilter: true,
	});

	React.useEffect(() => {
		table.setPageIndex(page);
		table.setPageSize(pageSize);
	}, [page, pageSize]);

	return (
		<div className=" min-h-screen p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-6">
					<h1 className="text-2xl font-semibold mb-4">History</h1>

					<div className="flex items-center justify-between">
						{/* Filter Dropdown - Left Side */}
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="outline"
									className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
								>
									<Filter className="w-4 h-4 mr-2" />
									Filter
									{hasActiveFilters && (
										<Badge
											variant="secondary"
											className="ml-2 bg-blue-600 text-white"
										>
											{statusFilter.length}
										</Badge>
									)}
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent className="bg-gray-800 border-gray-700">
								<div className="p-2">
									<div className="text-sm font-medium text-gray-300 mb-2">
										Status
									</div>
									{[
										"completed",
										"stopped",
										"waiting_response",
										"failed",
									].map((status: string) => (
										<DropdownMenuCheckboxItem
											key={status}
											checked={statusFilter.includes(
												status
											)}
											onCheckedChange={(
												checked: boolean
											) => {
												if (checked) {
													setStatusFilter([
														...statusFilter,
														status,
													]);
												} else {
													setStatusFilter(
														statusFilter.filter(
															(s: string) =>
																s !== status
														)
													);
												}
												setPage(0);
											}}
											className="text-gray-300 focus:bg-gray-700"
										>
											{status.replace("_", " ")}
										</DropdownMenuCheckboxItem>
									))}
								</div>
								{hasActiveFilters && (
									<>
										<div className="border-t border-gray-700 my-1" />
										<DropdownMenuItem
											onClick={() => {
												setStatusFilter([]);
												setPage(0);
											}}
											className="text-gray-300 focus:bg-gray-700"
										>
											Clear filters
										</DropdownMenuItem>
									</>
								)}
							</DropdownMenuContent>
						</DropdownMenu>

						{/* Search - Right Side */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
							<Input
								placeholder="Search"
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(0);
								}}
								className="pl-10 bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-gray-600 w-64"
							/>
						</div>
					</div>
				</div>
				
				{/* Active Filters */}
				{hasActiveFilters && (
					<div className="mb-4 text-sm text-gray-400">
						Filters applied:{" "}
						{statusFilter
							.map((s: string) => s.replace("_", " "))
							.join(", ")}
					</div>
				)}

				{/* Table */}
				<div className="rounded-lg overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow className="border-gray-700 hover:bg-gray-800">
								{table.getHeaderGroups().map((headerGroup) =>
									headerGroup.headers.map((header) => (
										<TableHead
											key={header.id}
											className="text-gray-400 font-medium py-4 px-6"
										>
											{header.isPlaceholder
												? null
												: typeof header.column.columnDef
														.header === "function"
												? header.column.columnDef.header(
														header.getContext()
												  )
												: header.column.columnDef
														.header}
										</TableHead>
									))
								)}
							</TableRow>
						</TableHeader>
						<TableBody>
							{!loading && filteredWorkflows.length ? (
								table.getRowModel().rows.map((row) => (
									<TableRow
										key={row.id}
										className="border-gray-700 hover:bg-gray-750"
									>
										{row.getVisibleCells().map((cell) => (
											<TableCell
												key={cell.id}
												className="py-4 px-6"
											>
												{typeof cell.column.columnDef
													.cell === "function"
													? cell.column.columnDef.cell(
															cell.getContext()
													  )
													: (cell.getValue() as React.ReactNode)}
											</TableCell>
										))}
									</TableRow>
								))
							) : !loading ? (
								<TableRow>
									<TableCell
										colSpan={columns.length}
										className="h-24 text-center text-gray-400"
									>
										No workflows found.
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</div>

				{/* Pagination */}
				<div className="flex items-center justify-between mt-6">
					<div className="text-sm text-gray-400">
						Showing{" "}
						{filteredWorkflows.length === 0
							? 0
							: page * pageSize + 1}{" "}
						to{" "}
						{Math.min(
							(page + 1) * pageSize,
							filteredWorkflows.length
						)}{" "}
						of {filteredWorkflows.length} results
					</div>

					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setPage((prev: number) => Math.max(prev - 1, 0))
							}
							disabled={page === 0 || loading}
							className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
						>
							<ChevronLeft className="w-4 h-4 mr-1" />
							Previous
						</Button>

						<div className="flex items-center gap-1">
							{(() => {
								const pageCount = Math.ceil(
									filteredWorkflows.length / pageSize
								);
								const current = page + 1;
								const pages: number[] = [];
								for (let i = 1; i <= pageCount; i++) {
									if (
										i === 1 ||
										i === pageCount ||
										Math.abs(i - current) <= 1
									) {
										pages.push(i);
									}
								}
								let lastPage = 0;
								return pages.map((page, idx) => {
									const items = [];
									if (page - lastPage > 1 && idx > 0) {
										items.push(
											<span
												key={`ellipsis-${page}`}
												className="text-gray-400 px-2"
											>
												...
											</span>
										);
									}
									items.push(
										<Button
											key={page}
											variant={
												current === page
													? "default"
													: "outline"
											}
											size="sm"
											onClick={() => setPage(page - 1)}
											className={
												current === page
													? "bg-blue-600 text-white hover:bg-blue-700"
													: "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
											}
											disabled={loading}
										>
											{page}
										</Button>
									);
									lastPage = page;
									return items;
								});
							})()}
						</div>

						<Button
							variant="outline"
							size="sm"
							onClick={() =>
								setPage((prev: number) =>
									prev + 1 <
									Math.ceil(
										filteredWorkflows.length / pageSize
									)
										? prev + 1
										: prev
								)
							}
							disabled={
								page + 1 >=
									Math.ceil(
										filteredWorkflows.length / pageSize
									) || loading
							}
							className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 disabled:opacity-50"
						>
							Next
							<ChevronRight className="w-4 h-4 ml-1" />
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
