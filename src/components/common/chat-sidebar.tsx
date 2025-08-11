"use client";
import React, { useState, useRef, useCallback } from "react";
import {
	Sidebar,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenu,
	SidebarContent,
	SidebarGroup,
	SidebarHeader,
} from "../ui/sidebar";
import Link from "next/link";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import {
	MoreVerticalIcon,
	Clock,
	Loader2,
	RefreshCw,
	CheckCircle,
	XCircle,
	TimerIcon,
} from "lucide-react";
import { useHistory } from "@/hooks/use-history";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";

const CHAT_OPTIONS = [1, 5, 10, 15, 20] as const;

// Map workflow status to icon
const getWorkflowIcon = (status: string) => {
	switch (status) {
		case "completed":
			return CheckCircle;
		case "waiting_response":
			return TimerIcon;
		case "stopped":
			return XCircle;
		default:
			return Clock;
	}
};

export default function ChatSidebar() {
	const [chatCount, setChatCount] = useState(5);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isSelectOpen, setIsSelectOpen] = useState(false);
	const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

	// Use the history hook to fetch real data
	const { history, loading, error, fetchHistory } = useHistory(chatCount);
	const { address } = useWallet();

	// Check if wallet is connected
	const hasWallet = !!address;

	const handleMouseEnter = useCallback(() => {
		setIsExpanded(true);
	}, []);

	const handleMouseLeave = useCallback(() => {
		if (!isSelectOpen && !isMenuSelectOpen) {
			setIsExpanded(false);
		}
	}, [isSelectOpen, isMenuSelectOpen]);

	const handleSelectOpenChange = useCallback(
		(open: boolean) => {
			setIsSelectOpen(open);

			if (open) {
				setIsExpanded(true);
			} else {
				setTimeout(() => {
					if (
						sidebarRef.current &&
						!sidebarRef.current.matches(":hover") &&
						!isMenuSelectOpen
					) {
						setIsExpanded(false);
					}
				}, 50);
			}
		},
		[isMenuSelectOpen]
	);

	const handleMenuSelectOpenChange = useCallback(
		(open: boolean) => {
			setIsMenuSelectOpen(open);

			if (open) {
				setIsExpanded(true);
			} else {
				setTimeout(() => {
					if (
						sidebarRef.current &&
						!sidebarRef.current.matches(":hover") &&
						!isSelectOpen
					) {
						setIsExpanded(false);
					}
				}, 50);
			}
		},
		[isSelectOpen]
	);

	const handleChatCountChange = useCallback(
		(value: string) => {
			const newCount = Number(value);
			setChatCount(newCount);
			// Fetch history with new limit
			fetchHistory(newCount);
		},
		[fetchHistory]
	);

	const handleRefresh = useCallback(async () => {
		if (isRefreshing) return;
		setIsRefreshing(true);
		try {
			await fetchHistory();
		} finally {
			setIsRefreshing(false);
		}
	}, [fetchHistory, isRefreshing]);

	// Use real history if available, otherwise show empty state
	const visibleItems =
		hasWallet && history.length > 0 ? history.slice(0, chatCount) : [];

	return (
		<Sidebar
			ref={sidebarRef}
			collapsible="none"
			className={`rounded-lg transition-all duration-200 ease-in-out flex flex-col   ${
				!isExpanded
					? "w-[calc(var(--sidebar-width-icon)+5px)]!"
					: "!w-56"
			} `}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<SidebarContent className="w-full  overflow-hidden ">
				<SidebarHeader>
					<SidebarMenu className="w-full px-1">
						<SidebarMenuItem
							className={`flex items-center gap-x-2 w-full transition-all duration-200 ${
								isExpanded
									? "justify-between"
									: "justify-center"
							}`}
						>
							<Label
								className={`text-sm font-medium transition-opacity duration-200 hidden text-primary-foreground ${
									isExpanded && "block"
								}`}
							>
								{loading ? "Loading..." : "Recents"}
							</Label>
							<Select
								onOpenChange={handleSelectOpenChange}
								value={chatCount.toString()}
								onValueChange={handleChatCountChange}
							>
								<SelectTrigger
									className={`!w-fit !h-7 px-[3.5px] py-0 !gap-x-1 bg-background border-0 text-sm rounded-md ${
										isExpanded ? "px-[6px]" : "px-[3.5px]"
									}`}
								>
									{loading ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<SelectValue />
									)}
								</SelectTrigger>
								<SelectContent>
									{CHAT_OPTIONS.map((count) => (
										<SelectItem
											key={count}
											value={count.toString()}
										>
											{count}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{isExpanded && (error || loading) && (
								<button
									onClick={handleRefresh}
									disabled={isRefreshing}
									className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
									title="Refresh history"
								>
									<RefreshCw className={`h-3 w-3 `} />
								</button>
							)}
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarGroup>
					<SidebarMenu
						className={`gap-y-2 flex flex-col transition-all duration-100 px-0 ${
							isExpanded ? "items-start" : "items-center"
						}`}
					>
						{error && isExpanded && (
							<div className="px-2 py-1 text-xs text-red-500">
								Failed to load history: {error}
							</div>
						)}
						{visibleItems.length === 0 &&
							!loading &&
							!error &&
							hasWallet && <></>}
						{!hasWallet && !loading && !error && <></>}
						{loading && (
							<div className="w-full flex flex-col gap-2">
								{[...Array(3)].map((_, index) => (
									<Skeleton
										key={index}
										className="h-6 w-full bg-background/50 rounded-md"
									/>
								))}
							</div>
						)}
						{visibleItems.map((workflow, index) => {
							const Icon = getWorkflowIcon(workflow.status);
							return (
								<SidebarMenuItem
									key={
										workflow.requestId ||
										workflow.id ||
										index
									}
									className="w-full"
								>
									<SidebarMenuButton
										asChild
										className="p-1 w-full"
									>
										<div className="w-full font-medium hover:text-primary-foreground transition-colors duration-150 ">
											<Link
												href={`/chat/agent/${workflow.agentId}?workflowId=${workflow.requestId}`}
												className="w-full flex items-center justify-center gap-x-1.5"
											>
												{Icon && (
													<Icon
														className={`!size-[19px]`}
													/>
												)}
												{isExpanded && (
													<div className="flex items-center !w-full flex-1 min-w-0">
														<div className="flex flex-col w-[140px] min-w-0">
															<TooltipProvider>
																<Tooltip>
																	<TooltipTrigger
																		asChild
																	>
																		<span className="text-sm text-ellipsis whitespace-nowrap overflow-hidden cursor-pointer">
																			{workflow.userPrompt ||
																				workflow.requestId}
																		</span>
																	</TooltipTrigger>
																	<TooltipContent>
																		<p className="max-w-xs">
																			{workflow.userPrompt ||
																				workflow.requestId}
																		</p>
																	</TooltipContent>
																</Tooltip>
															</TooltipProvider>
															{/* Status text removed as per instruction */}
														</div>
														<div className="flex-1" />
													</div>
												)}
											</Link>
											{isExpanded && (
												<Select
													onOpenChange={
														handleMenuSelectOpenChange
													}
													defaultValue="Left"
												>
													<SelectTrigger>
														<MoreVerticalIcon className="!size-4 flex-shrink-0" />
													</SelectTrigger>
													<SelectContent>
														{["Left", "Right"].map(
															(side) => (
																<SelectItem
																	key={side}
																	value={side}
																>
																	{side}
																</SelectItem>
															)
														)}
													</SelectContent>
												</Select>
											)}
										</div>
									</SidebarMenuButton>
								</SidebarMenuItem>
							);
						})}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}
