"use client";
import React, {
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo,
} from "react";
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
	PinIcon,
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
import { Button } from "../ui/button";
import { useExecutionStatusStore } from "@/stores/execution-status-store";

const CHAT_OPTIONS = [1, 5, 10, 15, 20] as const;

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

const ChatSidebar = React.memo(() => {
	const [chatCount, setChatCount] = useState(5);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isSelectOpen, setIsSelectOpen] = useState(false);
	const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const { history, loading, error, fetchHistory } = useHistory(chatCount);
	const { address } = useWallet();
	const { isRunning, responseId } = useExecutionStatusStore();

	const hasWallet = !!address;

	// Memoize visible items to prevent unnecessary re-renders
	const visibleItems = useMemo(() => {
		return hasWallet && history.length > 0
			? history.slice(0, chatCount)
			: [];
	}, [hasWallet, history, chatCount]);

	// Memoize sidebar expansion state
	const sidebarIsExpanded = useMemo(() => {
		return isPinned || isExpanded;
	}, [isPinned, isExpanded]);

	// Auto-fetch history when workflow execution starts
	useEffect(() => {
		if (isRunning && hasWallet) {
			console.log("🚀 Workflow started, fetching initial history");
			fetchHistory();

			// Start polling every 10 seconds
			pollingIntervalRef.current = setInterval(() => {
				console.log(
					"🔄 Auto-fetching history during workflow execution"
				);
				setIsAutoRefreshing(true);
				// Use setTimeout to reset the auto-refresh indicator after a short delay
				setTimeout(() => setIsAutoRefreshing(false), 1000);
				fetchHistory();
			}, 10000);
		}

		// Cleanup function to stop polling
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};
	}, [isRunning, hasWallet, fetchHistory]);

	// Stop polling when workflow completes
	useEffect(() => {
		if (!isRunning && pollingIntervalRef.current) {
			console.log("✅ Workflow completed, stopping history polling");
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;

			// Fetch final history update
			if (hasWallet) {
				fetchHistory();
			}
		}
	}, [isRunning, hasWallet, fetchHistory]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
				pollingIntervalRef.current = null;
			}
		};
	}, []);

	const handleMouseEnter = useCallback(() => {
		if (!isPinned) {
			setIsExpanded(true);
		}
	}, [isPinned]);

	const handleMouseLeave = useCallback(() => {
		if (!isPinned && !isSelectOpen && !isMenuSelectOpen) {
			setIsExpanded(false);
		}
	}, [isPinned, isSelectOpen, isMenuSelectOpen]);

	const handleSelectOpenChange = useCallback(
		(open: boolean) => {
			setIsSelectOpen(open);

			if (open) {
				if (!isPinned) setIsExpanded(true);
			} else {
				setTimeout(() => {
					if (
						sidebarRef.current &&
						!sidebarRef.current.matches(":hover") &&
						!isMenuSelectOpen &&
						!isPinned
					) {
						setIsExpanded(false);
					}
				}, 50);
			}
		},
		[isMenuSelectOpen, isPinned]
	);

	const handleMenuSelectOpenChange = useCallback(
		(open: boolean) => {
			setIsMenuSelectOpen(open);

			if (open) {
				if (!isPinned) setIsExpanded(true);
			} else {
				setTimeout(() => {
					if (
						sidebarRef.current &&
						!sidebarRef.current.matches(":hover") &&
						!isSelectOpen &&
						!isPinned
					) {
						setIsExpanded(false);
					}
				}, 50);
			}
		},
		[isSelectOpen, isPinned]
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

	return (
		<Sidebar
			ref={sidebarRef}
			collapsible="none"
			className={`rounded-lg transition-all duration-300 ease-in-out flex flex-col   ${
				!sidebarIsExpanded
					? "w-[calc(var(--sidebar-width-icon)+5px)]!"
					: "!w-56"
			} `}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<SidebarContent className="w-full  overflow-hidden z-50">
				<SidebarHeader>
					<SidebarMenu className="w-full px-1">
						<SidebarMenuItem
							className={`flex items-center gap-x-2 w-full transition-all duration-200 ${
								sidebarIsExpanded
									? "justify-between"
									: "justify-center"
							}`}
						>
							<Label
								className={`text-sm font-medium transition-opacity duration-200 hidden text-primary-foreground ${
									sidebarIsExpanded && "block"
								}`}
							>
								Recents
							</Label>
							<div className="flex items-center gap-x-2">
								<Select
									onOpenChange={handleSelectOpenChange}
									value={chatCount.toString()}
									onValueChange={handleChatCountChange}
								>
									<SelectTrigger
										className={`!w-fit !h-7 px-[3.5px] py-0 !gap-x-1 bg-background border-0 text-sm rounded-md ${
											sidebarIsExpanded
												? "px-[6px]"
												: "px-[3.5px]"
										}`}
									>
										<SelectValue />
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
								{sidebarIsExpanded && error && (
									<button
										onClick={handleRefresh}
										disabled={isRefreshing}
										className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Refresh history"
									>
										<RefreshCw className={`h-3 w-3 `} />
									</button>
								)}

								<div
									onClick={() => setIsPinned(!isPinned)}
									className={`!w-fit !h-7 px-2 flex items-center justify-center rounded-md transition-colors duration-200 ${
										sidebarIsExpanded ? "block" : "hidden"
									} ${isPinned ? "bg-background" : ""}`}
								>
									<PinIcon className="!size-4  rotate-45" />
								</div>
							</div>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarGroup>
					<SidebarMenu
						className={`gap-y-2 flex flex-col transition-all duration-100 px-0 ${
							sidebarIsExpanded ? "items-start" : "items-center"
						}`}
					>
						{/* Show loading skeletons only on initial load */}
						{loading && history.length === 0 ? (
							<div className="w-full flex flex-col gap-2">
								{[...Array(3)].map((_, index) => (
									<Skeleton
										key={index}
										className="h-6 w-full bg-background/50 rounded-md"
									/>
								))}
							</div>
						) : (
							<>
								{/* Only show error and history when not loading */}
								{error && sidebarIsExpanded && (
									<div className="px-2 py-1 text-xs text-red-500">
										Failed to load history: {error}
									</div>
								)}
								{visibleItems.length === 0 &&
									!error &&
									!loading &&
									hasWallet && <></>}
								{!hasWallet && !error && !loading && <></>}
								{visibleItems.map((workflow, index) => {
									const Icon = getWorkflowIcon(
										workflow.status
									);
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
														{sidebarIsExpanded && (
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
													{sidebarIsExpanded && (
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
																{[
																	"Left",
																	"Right",
																].map(
																	(side) => (
																		<SelectItem
																			key={
																				side
																			}
																			value={
																				side
																			}
																		>
																			{
																				side
																			}
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
							</>
						)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
});

export default ChatSidebar;
