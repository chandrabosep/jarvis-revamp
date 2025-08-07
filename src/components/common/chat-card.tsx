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
			className="cursor-pointer relative w-64 bg-input border border-border rounded-2xl px-3 py-4 flex flex-col gap-y-4.5"
			onClick={onClick}
		>
			{/* The image now only covers the area above the text */}
			<div
				className="absolute top-0 left-0 w-full z-0"
				style={{ height: "calc(100% - 64px)" }}
			>
				<Image
					src="/bubble-grid.svg"
					alt="chat-card-bg"
					className="opacity-60 w-full h-full rounded-2xl"
					fill
					style={{ objectFit: "cover", borderRadius: "1rem" }}
					sizes="(max-width: 320px) 100vw, 320px"
					priority={false}
				/>
			</div>
			<div className="space-y-2.5 relative z-10">
				<div className="flex items-center gap-4">
					<div className="size-6 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={3}
							className="size-3 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 h-2 bg-[#CDD1D4] rounded-full"></div>
				</div>

				<div className="flex items-center gap-4">
					<div className="size-6 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={3}
							className="size-3 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 relative">
						<div className="h-2 bg-[#CDD1D4] rounded-full"></div>
						<div className="border border-border/30 absolute left-[40%] top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-13 h-8 text-background/80 bg-[#CDD1D4] rounded-2xl flex items-center justify-center">
							{icon}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-4">
					<div className="size-6 rounded-full border-2 border-[#CDD1D4] flex items-center justify-center">
						<Check
							strokeWidth={3}
							className="size-3 text-[#CDD1D4]"
						/>
					</div>
					<div className="flex-1 h-2 bg-[#CDD1D4] rounded-full"></div>
				</div>
			</div>

			<div className="pt-3 relative z-10">
				<h2 className="text-foreground font-medium">{title}</h2>
				<p className="text-muted-foreground text-sm">{description}</p>
			</div>
		</div>
	);
}
