import React from "react";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Props for the workflow executor component
interface WorkflowExecutorProps {
	skyBrowser: any;
	web3Context: any;
	agentId: string;
	prompt: string;
	workflow: any[];
	isIndividualTool?: boolean;
	activeNodeId?: string;
}

/**
 * Workflow Executor Component
 *
 * This component demonstrates how to use the workflow execution hook.
 * It provides a simple interface for executing workflows and monitoring their status.
 *
 * Features:
 * - Execute workflows with a button click
 * - Real-time status monitoring
 * - Progress tracking
 * - Error handling
 * - Stop execution capability
 */
export function WorkflowExecutor({
	skyBrowser,
	web3Context,
	agentId,
	prompt,
	workflow,
	isIndividualTool = false,
	activeNodeId,
}: WorkflowExecutorProps) {
	const {
		executeWorkflow,
		isExecuting,
		currentStatus,
		error,
		stopExecution,
	} = useWorkflowExecution();

	/**
	 * Handle workflow execution
	 */
	const handleExecute = async () => {
		await executeWorkflow({
			skyBrowser,
			web3Context,
			agentId,
			prompt,
			workflow,
			isIndividualTool,
			activeNodeId,
		});
	};

	/**
	 * Get color for status badge
	 */
	const getStatusColor = (status: string) => {
		switch (status) {
			case "completed":
				return "bg-green-500";
			case "failed":
				return "bg-red-500";
			case "in_progress":
				return "bg-blue-500";
			case "pending":
				return "bg-yellow-500";
			default:
				return "bg-gray-500";
		}
	};

	/**
	 * Get progress percentage
	 */
	const getProgressPercentage = () => {
		if (!currentStatus) return 0;

		if (currentStatus.progress !== undefined) {
			return currentStatus.progress;
		}

		// Calculate progress based on completed subnets
		if (currentStatus.completedSubnets && currentStatus.totalSubnets) {
			return Math.round(
				(currentStatus.completedSubnets.length /
					currentStatus.totalSubnets) *
					100
			);
		}

		return 0;
	};

	return (
		<Card className="w-full max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center justify-between">
					Workflow Executor
					{currentStatus && (
						<Badge
							className={getStatusColor(
								currentStatus.workflowStatus
							)}
						>
							{currentStatus.workflowStatus}
						</Badge>
					)}
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Execution Controls */}
				<div className="space-y-2">
					<Button
						onClick={handleExecute}
						disabled={isExecuting}
						className="w-full"
					>
						{isExecuting ? "Executing..." : "Execute Workflow"}
					</Button>

					{isExecuting && (
						<Button
							onClick={stopExecution}
							variant="destructive"
							className="w-full"
						>
							Stop Execution
						</Button>
					)}
				</div>

				{/* Progress Display */}
				{currentStatus && (
					<div className="space-y-2">
						<div className="text-sm">
							<strong>Current Subnet:</strong>{" "}
							{currentStatus.currentSubnet || "N/A"}
						</div>
						<div className="text-sm">
							<strong>Progress:</strong> {getProgressPercentage()}
							%
						</div>
						<Progress
							value={getProgressPercentage()}
							className="w-full"
						/>

						{/* Subnet Details */}
						{currentStatus.completedSubnets &&
							currentStatus.totalSubnets && (
								<div className="text-sm text-gray-600">
									Completed:{" "}
									{currentStatus.completedSubnets.length} /{" "}
									{currentStatus.totalSubnets}
								</div>
							)}
					</div>
				)}

				{/* Error Display */}
				{error && (
					<div className="text-sm text-red-500 p-3 bg-red-50 rounded">
						<strong>Error:</strong> {error}
					</div>
				)}

				{/* Result Display */}
				{currentStatus?.result && (
					<div className="text-sm">
						<strong>Result:</strong>
						<pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
							{JSON.stringify(currentStatus.result, null, 2)}
						</pre>
					</div>
				)}

				{/* Request ID Display */}
				{currentStatus?.requestId && (
					<div className="text-xs text-gray-500">
						<strong>Request ID:</strong> {currentStatus.requestId}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
