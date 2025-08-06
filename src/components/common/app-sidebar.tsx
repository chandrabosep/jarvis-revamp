"use client";
import * as React from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import Link from "next/link";
import Image from "next/image";
import {
	HistoryIcon,
	PlusCircleIcon,
	Wallet2Icon,
	LogOutIcon,
} from "lucide-react";
import CustomTooltip from "./custom-tool-tip";
import { usePathname } from "next/navigation";
import ChatSidebar from "./chat-sidebar";

const navItems = [
	{
		icon: <PlusCircleIcon />,
		title: "Create",
		url: "/create",
	},
	{
		icon: <HistoryIcon />,
		title: "History",
		url: "/history",
	},
	{
		icon: <Wallet2Icon />,
		title: "Manage Funds",
		url: "/manage-funds",
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const isChat = pathname.includes("/chat");

	return (
		<>
			<Sidebar
				variant="floating"
				className="overflow-hidden *:data-[sidebar=sidebar]:flex-row !w-fit"
				{...props}
			>
				<Sidebar
					collapsible="none"
					className={` w-[calc(var(--sidebar-width-icon)+1px)]! ${
						isChat ? "rounded-l-lg border-r " : "rounded-lg"
					}`}
				>
					<SidebarHeader className="pt-4 pb-6">
						<SidebarMenu>
							<SidebarMenuItem>
								<Link href="/dashboard">
									<Image
										src="logo.svg"
										alt="logo"
										className="size-9"
										width={500}
										height={500}
									/>
								</Link>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarHeader>
					<SidebarContent>
						<SidebarGroup>
							<SidebarMenu className="gap-y-4 flex flex-col items-center">
								{navItems.map((item) => (
									<SidebarMenuItem
										key={item.title}
										className="w-fit"
									>
										<SidebarMenuButton asChild>
											<CustomTooltip content={item.title}>
												<Link
													href={item.url}
													className="font-medium hover:text-primary-foreground"
												>
													{item.icon}
												</Link>
											</CustomTooltip>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroup>
					</SidebarContent>
					<SidebarFooter className="pb-4">
						<SidebarMenu className="flex flex-col items-center">
							<SidebarMenuItem className="w-fit hover:text-primary-foreground cursor-pointer">
								<CustomTooltip content="Logout">
									<LogOutIcon className="size-5" />
								</CustomTooltip>
							</SidebarMenuItem>
						</SidebarMenu>
					</SidebarFooter>
				</Sidebar>

				{isChat && <ChatSidebar />}
			</Sidebar>
		</>
	);
}
