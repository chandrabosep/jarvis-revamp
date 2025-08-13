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
import { usePathname, useRouter } from "next/navigation";
import { useWallet } from "@/hooks/use-wallet";
import { useGlobalStore } from "@/stores/global-store";
import { useChatStore } from "@/stores/chat-store";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";
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
		url: "/",
	},
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const router = useRouter();
	const { disconnect } = useWallet();
	const { reset: resetGlobalStore } = useGlobalStore();
	const { reset: resetChatStore } = useChatStore();
	const { reset: resetWorkflowExecutionStore } = useWorkflowExecutionStore();
	const isChat = pathname.includes("/chat") || pathname.includes("/create");

	const handleLogout = async () => {
		try {
			// Disconnect wallet
			await disconnect();
			// Reset all stores
			resetGlobalStore();
			resetChatStore();
			resetWorkflowExecutionStore();
			// Navigate to home page
			router.push("/");
		} catch (error) {
			console.error("Logout failed:", error);
		}
	};

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
								<Link href="/create">
									<Image
										src="/logo.png"
										alt="logo"
										className="w-9"
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
									<LogOutIcon
										className="size-5"
										onClick={handleLogout}
									/>
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
