import React from "react";
import {
	Sidebar,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenu,
	SidebarContent,
	SidebarGroup,
} from "../ui/sidebar";
import CustomTooltip from "./custom-tool-tip";
import Link from "next/link";
import { HomeIcon } from "lucide-react";
import { HistoryIcon } from "lucide-react";
import { PlusIcon } from "lucide-react";

export default function ChatSidebar() {
	const navItems = [
		{ title: "Home", url: "/", icon: <HomeIcon /> },
		{ title: "History", url: "/history", icon: <HistoryIcon /> },
		{ title: "Create", url: "/create", icon: <PlusIcon /> },
	];
	return (
		<>
			<Sidebar
				collapsible="none"
				className="rounded-lg w-[calc(var(--sidebar-width-icon)+4px)]! items-center"
			>
				<SidebarContent>
					<SidebarGroup>
						<SidebarMenu className="gap-y-3 flex flex-col items-center">
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
			</Sidebar>
		</>
	);
}
