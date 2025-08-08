import { Check } from "lucide-react";
import Image from "next/image";

export default function ChatCard({
	title,
	description,
	icon,
	onClick,
}: {
	title: string;
	description: string;
	icon: React.ReactNode;
	onClick: () => void;
}) {
	return (
		<div
			className="cursor-pointer relative w-60 bg-secondary border border-border rounded-xl px-2 py-6 flex flex-col gap-y-4"
			onClick={onClick}
		>
			<div
				className="absolute top-0 left-0 w-full z-0"
				style={{ height: "calc(100% - 48px)" }}
			>
				<Image
					src="/bubble-grid.svg"
					alt="chat-card-bg"
					className="opacity-60 w-full h-full rounded-xl"
					fill
					style={{ objectFit: "cover", borderRadius: "0.75rem" }}
					sizes="(max-width: 240px) 100vw, 240px"
					priority={false}
				/>
			</div>
			<div className="space-y-1.5 relative z-10">
				<div className="flex items-center gap-2.5">
					<div className="size-4 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={2}
							className="size-2 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 h-1 bg-[#CDD1D4] rounded-full"></div>
				</div>

				<div className="flex items-center gap-2.5">
					<div className="size-4 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={2}
							className="size-2 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 relative">
						<div className="h-1 bg-[#CDD1D4] rounded-full"></div>
						<div className="border border-border/30 absolute left-[40%] top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-5 text-background/80 bg-[#CDD1D4] rounded-xl flex items-center justify-center">
							{icon}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-2.5">
					<div className="size-4 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={2}
							className="size-2 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 h-1 bg-[#CDD1D4] rounded-full"></div>
				</div>
			</div>

			<div className="pt-2 relative z-10">
				<h2 className="text-foreground font-medium text-base">{title}</h2>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
		</div>
	);
}
