import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CustomTooltip({
	children,
	content,
}: {
	children: React.ReactNode;
	content: string;
}) {
	return (
		<Tooltip>
			<TooltipTrigger>{children}</TooltipTrigger>
			<TooltipContent side="right" align="center">
				<p>{content}</p>
			</TooltipContent>
		</Tooltip>
	);
}
