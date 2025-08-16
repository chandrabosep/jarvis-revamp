"use client";
import React, {
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
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
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "../ui/tooltip";
import { Skeleton } from "../ui/skeleton";
import { useWallet } from "@/hooks/use-wallet";
import { useExecutionStatusStore } from "@/stores/execution-status-store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getHistory } from "@/controllers/requests";
import { prefetchChatData } from "@/utils/chat-utils";

const CHAT_OPTIONS = [1, 5, 10, 15, 20] as const;

interface WorkflowItem {
	requestId: string;
	id?: string;
	agentId: string;
	status: string;
	userPrompt?: string;
}

const getWorkflowIcon = (status: string) => {
	switch (status) {
		case "completed":
			return CheckCircle;
		case "waiting_response":
			return TimerIcon;
		case "stopped":
		case "failed":
			return XCircle;
		case "in_progress":
			return TimerIcon;
		case "pending":
		default:
			return Clock;
	}
};

const WorkflowItem = React.memo(
	({
		workflow,
		index,
		sidebarIsExpanded,
		handleMenuSelectOpenChange,
		onPrefetch,
		isSelected,
		isRunning,
	}: {
		workflow: WorkflowItem;
		index: number;
		sidebarIsExpanded: boolean;
		handleMenuSelectOpenChange: (open: boolean) => void;
		onPrefetch: (workflowId: string) => void;
		isSelected: boolean;
		isRunning: boolean;
	}) => {
		const Icon = getWorkflowIcon(workflow.status);

		return (
			<SidebarMenuItem
				key={workflow.requestId || workflow.id || index}
				className="w-full"
			>
				<SidebarMenuButton
					asChild
					className={`p-1 w-full ${
						isSelected
							? "bg-primary/20 border-l-2 border-primary"
							: ""
					}`}
				>
					<div
						className={`w-full font-medium hover:text-primary-foreground transition-colors duration-150 ${
							isSelected ? "text-primary" : ""
						}`}
					>
						<Link
							href={`/chat/agent/${workflow.agentId}?workflowId=${workflow.requestId}`}
							className="w-full flex items-center justify-center gap-x-1.5"
							onMouseEnter={() =>
								onPrefetch(
									workflow.requestId || workflow.id || ""
								)
							}
						>
							{Icon && <Icon className="!size-[19px]" />}
							{sidebarIsExpanded && (
								<div className="flex items-center !w-full flex-1 min-w-0">
									<div className="flex flex-col w-[140px] min-w-0">
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
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
									</div>
									<div className="flex-1" />
								</div>
							)}
						</Link>
						{sidebarIsExpanded && (
							<Select
								onOpenChange={handleMenuSelectOpenChange}
								defaultValue="Left"
							>
								<SelectTrigger>
									<MoreVerticalIcon className="!size-4 flex-shrink-0" />
								</SelectTrigger>
								<SelectContent>
									{["Left", "Right"].map((side) => (
										<SelectItem key={side} value={side}>
											{side}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}
);

WorkflowItem.displayName = "WorkflowItem";

const ChatSidebar = React.memo(() => {
	const [chatCount, setChatCount] = useState(5);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isSelectOpen, setIsSelectOpen] = useState(false);
	const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false);
	const [isPinned, setIsPinned] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

	const { address, skyBrowser } = useWallet();
	const { isRunning } = useExecutionStatusStore();
	const queryClient = useQueryClient();

	const params = useParams();
	const searchParams = useSearchParams();
	const currentAgentId = params?.id as string;
	const currentWorkflowId = searchParams?.get("workflowId");

	const hasWallet = !!address;

	// Check if any workflow in the history is active (processing or waiting_response)
	const hasActiveWorkflow = (workflows: WorkflowItem[]) => {
		return workflows.some(
			(workflow) =>
				workflow.status === "in_progress" ||
				workflow.status === "waiting_response" ||
				workflow.status === "pending"
		);
	};

	const { data, refetch, isRefetching, isLoading, error } = useQuery({
		queryKey: ["history", chatCount, address],
		queryFn: async () => {
			const response = await getHistory(
				{ limit: chatCount },
				skyBrowser || undefined,
				address ? { address } : undefined
			);

			if (response.workflows && Array.isArray(response.workflows)) {
				return response.workflows;
			} else if (response.success && response.data?.requests) {
				return response.data.requests;
			}
			return [];
		},
		enabled: !!address && !!skyBrowser,
		// Poll every 1 minute if there's an active workflow or if exactly 5 histories are shown with any active
		refetchInterval: (query) => {
			const workflows = query.state.data as WorkflowItem[] | undefined;
			if (!workflows) return false;

			// Poll if any workflow is active
			if (hasActiveWorkflow(workflows)) {
				return 60000; // 1 minute
			}

			// Also poll if exactly 5 histories are shown and any are active
			if (chatCount === 5 && hasActiveWorkflow(workflows.slice(0, 5))) {
				return 60000; // 1 minute
			}

			return false;
		},
		staleTime: 1000 * 60 * 5,
		gcTime: 1000 * 60 * 30,
		refetchOnWindowFocus: false,
		refetchOnMount: false,
		refetchOnReconnect: false,
	});

	const handlePrefetchChatData = useCallback(
		(workflowId: string) => {
			prefetchChatData(workflowId, queryClient);
		},
		[queryClient]
	);

	const history = data || [];

	const visibleItems = useMemo(() => {
		return hasWallet && history.length > 0
			? history.slice(0, chatCount)
			: [];
	}, [hasWallet, history, chatCount]);

	const sidebarIsExpanded = useMemo(() => {
		return isPinned || isExpanded;
	}, [isPinned, isExpanded]);

	const shouldShowError = useMemo(() => {
		return error && sidebarIsExpanded;
	}, [error, sidebarIsExpanded]);

	const shouldShowLoading = useMemo(() => {
		return isLoading && history.length === 0;
	}, [isLoading, history.length]);

	useEffect(() => {
		if (hasWallet) {
			if (isRunning) {
				console.log("🚀 Workflow started, refetching history");
			} else {
				console.log(
					"✅ Workflow completed, fetching final history update"
				);
			}
			refetch();
		}
	}, [isRunning, hasWallet, refetch]);

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

	const createSelectHandler = useCallback(
		(setterFn: (open: boolean) => void, otherSelectOpen: boolean) => {
			return (open: boolean) => {
				setterFn(open);

				if (open) {
					if (!isPinned) setIsExpanded(true);
				} else {
					setTimeout(() => {
						if (
							sidebarRef.current &&
							!sidebarRef.current.matches(":hover") &&
							!otherSelectOpen &&
							!isPinned
						) {
							setIsExpanded(false);
						}
					}, 50);
				}
			};
		},
		[isPinned]
	);

	const handleSelectOpenChange = useMemo(
		() => createSelectHandler(setIsSelectOpen, isMenuSelectOpen),
		[createSelectHandler, isMenuSelectOpen]
	);

	const handleMenuSelectOpenChange = useMemo(
		() => createSelectHandler(setIsMenuSelectOpen, isSelectOpen),
		[createSelectHandler, isSelectOpen]
	);

	const handleChatCountChange = useCallback((value: string) => {
		setChatCount(Number(value));
	}, []);

	const handleRefresh = useCallback(async () => {
		if (!isRefetching) {
			refetch();
		}
	}, [refetch, isRefetching]);

	const handlePinToggle = useCallback(() => {
		setIsPinned(!isPinned);
	}, [isPinned]);

	return (
		<Sidebar
			ref={sidebarRef}
			collapsible="none"
			className={`rounded-lg transition-all duration-300 ease-in-out flex flex-col ${
				!sidebarIsExpanded
					? "w-[calc(var(--sidebar-width-icon)+5px)]!"
					: "!w-56"
			}`}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			<SidebarContent className="w-full overflow-hidden z-50">
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
										disabled={isRefetching}
										className="p-1 hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										title="Refresh history"
									>
										<RefreshCw
											className={`h-3 w-3 ${
												isRefetching
													? "animate-spin"
													: ""
											}`}
										/>
									</button>
								)}

								<div
									onClick={handlePinToggle}
									className={`!w-fit !h-7 px-2 flex items-center justify-center rounded-md transition-colors duration-200 ${
										sidebarIsExpanded ? "block" : "hidden"
									} ${isPinned ? "bg-background" : ""}`}
								>
									<PinIcon className="!size-4 rotate-45" />
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
						{shouldShowLoading ? (
							<div className="w-full flex flex-col gap-2">
								{Array.from({ length: 3 }, (_, index) => (
									<Skeleton
										key={index}
										className="h-6 w-full bg-background/50 rounded-md"
									/>
								))}
							</div>
						) : (
							<>
								{shouldShowError && (
									<div className="px-2 py-1 text-xs text-red-500">
										Failed to load history:{" "}
										{error?.message || "Unknown error"}
									</div>
								)}
								{visibleItems.map(
									(workflow: WorkflowItem, index: number) => {
										const isSelected =
											currentAgentId ===
												workflow.agentId &&
											currentWorkflowId ===
												workflow.requestId;

										const isRunning =
											workflow.status === "in_progress" ||
											workflow.status ===
												"waiting_response" ||
											workflow.status === "pending";

										return (
											<WorkflowItem
												key={
													workflow.requestId ||
													workflow.id ||
													index
												}
												workflow={workflow}
												index={index}
												sidebarIsExpanded={
													sidebarIsExpanded
												}
												handleMenuSelectOpenChange={
													handleMenuSelectOpenChange
												}
												onPrefetch={
													handlePrefetchChatData
												}
												isSelected={isSelected}
												isRunning={isRunning}
											/>
										);
									}
								)}
							</>
						)}
					</SidebarMenu>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
});

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;
