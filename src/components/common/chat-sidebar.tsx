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
import * as LucideIcons from "lucide-react";
import { MoreVerticalIcon } from "lucide-react";

const CHAT_OPTIONS = [1, 5, 10, 15, 20] as const;

const NAV_ITEMS = [
	{ title: "Write a poem about the ocean", url: "/", icon: "HomeIcon" },
	{ title: "Summarize this article", url: "/history", icon: "HistoryIcon" },
	{ title: "Brainstorm startup ideas", url: "/create", icon: "PlusIcon" },
	{
		title: "Explain quantum computing simply",
		url: "/quantum",
		icon: "CpuIcon",
	},
	{ title: "Translate to French", url: "/translate", icon: "LanguagesIcon" },
] as const;

export default function ChatSidebar() {
	const [chatCount, setChatCount] = useState(5);
	const [isExpanded, setIsExpanded] = useState(false);
	const [isSelectOpen, setIsSelectOpen] = useState(false);
	const [isMenuSelectOpen, setIsMenuSelectOpen] = useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

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

	const visibleNavItems = NAV_ITEMS.slice(0, chatCount);

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
								Recents
							</Label>
							<Select
								onOpenChange={handleSelectOpenChange}
								value={chatCount.toString()}
								onValueChange={(value) =>
									setChatCount(Number(value))
								}
							>
								<SelectTrigger
									className={`!w-fit !h-7 px-[3.5px] py-0 !gap-x-1 bg-background border-0 text-sm rounded-md ${
										isExpanded ? "px-[6px]" : "px-[3.5px]"
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
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>

				<SidebarGroup>
					<SidebarMenu
						className={`gap-y-2 flex flex-col transition-all duration-100 px-0 ${
							isExpanded ? "items-start" : "items-center"
						}`}
					>
						{visibleNavItems.map((item) => {
							const LucideIcon = (LucideIcons as any)[item.icon];

							return (
								<SidebarMenuItem
									key={item.title}
									className="w-full"
								>
									<SidebarMenuButton
										asChild
										className="p-1 w-full"
									>
										<div className="w-full font-medium hover:text-primary-foreground transition-colors duration-150 ">
											<Link
												href={item.url}
												className="w-full flex items-center justify-center gap-x-1.5"
											>
												{LucideIcon && (
													<LucideIcon className="!size-[19px]" />
												)}
												{isExpanded && (
													<div className="flex items-center !w-full flex-1 min-w-0">
														<span className="text-sm w-[140px] text-ellipsis whitespace-nowrap overflow-hidden">
															{item.title}
														</span>
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
