import { useCallback, useRef } from "react";
import { useSubnetCacheStore } from "@/stores";
import { ChatMsg } from "@/types/chat";
import { parseAgentResponse, createContentHash } from "@/utils/message-parser";

export const useSubnetCache = () => {
	const {
		cacheSubnetData,
		getCachedSubnetData,
		hasSubnetChanged,
		clearWorkflowCache,
		updateSubnetStatus,
	} = useSubnetCacheStore();

	// Track previous states for transitions
	const subnetPreviousStatus = useRef<Map<string, Map<number, string>>>(
		new Map()
	);
	const feedbackGivenForSubnet = useRef<Map<string, Set<number>>>(new Map());
	const postFeedbackProcessing = useRef<Map<string, Map<number, boolean>>>(
		new Map()
	);
	// Track which messages have already been generated to prevent duplicates
	const generatedMessageIds = useRef<Map<string, Set<string>>>(new Map());

	// Get or create workflow tracking maps
	const getWorkflowMaps = useCallback((workflowId: string) => {
		if (!subnetPreviousStatus.current.has(workflowId)) {
			subnetPreviousStatus.current.set(workflowId, new Map());
		}
		if (!feedbackGivenForSubnet.current.has(workflowId)) {
			feedbackGivenForSubnet.current.set(workflowId, new Set());
		}
		if (!postFeedbackProcessing.current.has(workflowId)) {
			postFeedbackProcessing.current.set(workflowId, new Map());
		}
		if (!generatedMessageIds.current.has(workflowId)) {
			generatedMessageIds.current.set(workflowId, new Set());
		}

		return {
			statusMap: subnetPreviousStatus.current.get(workflowId)!,
			feedbackSet: feedbackGivenForSubnet.current.get(workflowId)!,
			processingMap: postFeedbackProcessing.current.get(workflowId)!,
			messageIds: generatedMessageIds.current.get(workflowId)!,
		};
	}, []);

	// Clear workflow tracking when switching workflows
	const clearWorkflowTracking = useCallback((workflowId: string) => {
		subnetPreviousStatus.current.delete(workflowId);
		feedbackGivenForSubnet.current.delete(workflowId);
		postFeedbackProcessing.current.delete(workflowId);
		generatedMessageIds.current.delete(workflowId);
	}, []);

	// Reset message tracking for a specific workflow (useful for debugging)
	const resetMessageTracking = useCallback((workflowId: string) => {
		if (generatedMessageIds.current.has(workflowId)) {
			generatedMessageIds.current.get(workflowId)!.clear();
			console.log(`🔄 Reset message tracking for workflow ${workflowId}`);
		}
	}, []);

	// Process subnet data and return chat messages
	const processSubnetData = useCallback(
		(
			workflowId: string,
			subnetData: any[],
			lastQuestionRef: React.MutableRefObject<string | null>
		): ChatMsg[] => {
			console.log(
				`🔄 Processing subnet data for workflow ${workflowId}:`,
				subnetData?.length || 0,
				"subnets"
			);

			if (!subnetData || subnetData.length === 0) return [];

			const { statusMap, feedbackSet, processingMap, messageIds } =
				getWorkflowMaps(workflowId);
			const messages: ChatMsg[] = [];

			subnetData.forEach((subnet: any, index: number) => {
				const prevStatus = statusMap.get(index);
				const currentStatus = subnet.status;

				console.log(
					`📊 Subnet ${index}: ${
						prevStatus || "new"
					} -> ${currentStatus}`
				);
				console.log(`🔍 Subnet ${index} data:`, {
					status: subnet.status,
					hasData: !!subnet.data,
					dataType: typeof subnet.data,
					dataPreview: subnet.data
						? JSON.stringify(subnet.data).slice(0, 100)
						: "no-data",
					hasQuestion: !!subnet.question,
					questionType: subnet.question?.type,
					questionText: subnet.question?.text?.slice(0, 50),
				});

				// Check if subnet has changed
				const hasChanged = hasSubnetChanged(workflowId, index, subnet);

				// Cache the subnet data
				cacheSubnetData(workflowId, index, subnet);

				// Determine transitions
				const isRegenerating =
					prevStatus === "waiting_response" &&
					currentStatus === "in_progress";
				const isShowingQuestion =
					prevStatus === "in_progress" &&
					currentStatus === "waiting_response";

				if (isRegenerating) {
					console.log(
						`🔄 Subnet ${index} is regenerating after feedback`
					);
				}
				if (isShowingQuestion) {
					console.log(`❓ Subnet ${index} is showing question`);
				}

				// Update tracking maps
				if (isRegenerating) {
					processingMap.set(index, true);
					feedbackSet.add(index);
				}

				// Update previous status
				statusMap.set(index, currentStatus);

				// Generate messages based on status and changes
				if (hasChanged || !prevStatus) {
					console.log(
						`✨ Generating message for subnet ${index} (changed: ${hasChanged}, new: ${!prevStatus})`
					);

					const message = createSubnetMessage(
						workflowId,
						index,
						subnet,
						{
							isRegenerating,
							isShowingQuestion,
							hasFeedback: feedbackSet.has(index),
							isProcessingAfterFeedback:
								processingMap.get(index) || false,
						}
					);

					if (message) {
						// Check if this message has already been generated
						const messageKey = `${workflowId}_${index}_${
							subnet.status
						}_${
							subnet.data
								? JSON.stringify(subnet.data).slice(0, 100)
								: "no-data"
						}`;

						if (!messageIds.has(messageKey)) {
							messages.push(message);
							messageIds.add(messageKey);
							console.log(
								`✅ Message generated for subnet ${index}:`,
								message.type,
								`Content: "${message.content?.slice(0, 50)}..."`
							);
						} else {
							console.log(
								`⏭️ Skipping duplicate message for subnet ${index}`
							);
						}
					} else {
						console.log(
							`⚠️ No message generated for subnet ${index} - status: ${
								subnet.status
							}, hasData: ${!!subnet.data}`
						);
					}

					// Handle questions with deduplication
					if (subnet.question && (hasChanged || isShowingQuestion)) {
						const questionKey = `question_${workflowId}_${index}_${subnet.question.text}`;

						if (!messageIds.has(questionKey)) {
							const questionMessage = createQuestionMessage(
								subnet,
								index
							);
							if (questionMessage) {
								messages.push(questionMessage);
								lastQuestionRef.current = questionMessage.id;
								messageIds.add(questionKey);
								console.log(
									`❓ Question message generated for subnet ${index}:`,
									`"${questionMessage.content?.slice(
										0,
										50
									)}..."`
								);
							}
						} else {
							console.log(
								`⏭️ Skipping duplicate question for subnet ${index}`
							);
						}
					} else if (subnet.question) {
						console.log(
							`⚠️ Question exists for subnet ${index} but not generating: hasChanged=${hasChanged}, isShowingQuestion=${isShowingQuestion}`
						);
					}

					// Handle notifications with deduplication
					if (
						subnet.question?.type === "notification" &&
						(hasChanged || isShowingQuestion)
					) {
						const notificationKey = `notification_${workflowId}_${index}_${subnet.question.text}`;

						if (!messageIds.has(notificationKey)) {
							const notificationMessage =
								createNotificationMessage(subnet, index);
							if (notificationMessage) {
								messages.push(notificationMessage);
								messageIds.add(notificationKey);
								console.log(
									`🔔 Notification message generated for subnet ${index}`
								);
							}
						} else {
							console.log(
								`⏭️ Skipping duplicate notification for subnet ${index}`
							);
						}
					}
				} else {
					console.log(
						`⏭️ Skipping subnet ${index} - no changes detected`
					);
				}

				// Clean up processing state when done
				if (currentStatus === "done" && processingMap.has(index)) {
					processingMap.delete(index);
					feedbackSet.delete(index);
					console.log(
						`🧹 Cleaned up processing state for subnet ${index}`
					);
				}
			});

			console.log(
				`📝 Generated ${messages.length} messages for workflow ${workflowId}`
			);
			console.log(
				`🔍 Message deduplication: ${messageIds.size} unique message keys tracked`
			);
			return messages;
		},
		[cacheSubnetData, hasSubnetChanged, getWorkflowMaps]
	);

	// Create subnet message based on status
	const createSubnetMessage = useCallback(
		(
			workflowId: string,
			index: number,
			subnet: any,
			options: {
				isRegenerating: boolean;
				isShowingQuestion: boolean;
				hasFeedback: boolean;
				isProcessingAfterFeedback: boolean;
			}
		): ChatMsg | null => {
			const {
				isRegenerating,
				isShowingQuestion,
				hasFeedback,
				isProcessingAfterFeedback,
			} = options;
			const sourceId = `subnet_${index}_${subnet.status}`;

			switch (subnet.status) {
				case "pending":
					return null; // Don't show pending subnets

				case "in_progress":
					if (isProcessingAfterFeedback) {
						return {
							id: `subnet_${index}_processing_after_feedback_${Date.now()}`,
							type: "workflow_subnet",
							content: "Processing...",
							timestamp: new Date(),
							subnetStatus: "in_progress",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: `${sourceId}_processing_after_feedback`,
							isRegenerated: true,
						};
					} else {
						return {
							id: `subnet_${index}_${Date.now()}`,
							type: "workflow_subnet",
							content: "Processing...",
							timestamp: new Date(),
							subnetStatus: "in_progress",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: sourceId,
						};
					}

				case "done":
					if (subnet.data) {
						const result = parseAgentResponse(subnet.data);
						const contentHash = createContentHash(result);

						let content = result.content || "Processing completed";

						// Handle special data formats
						try {
							const parsedData = JSON.parse(subnet.data);
							if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							}
						} catch {
							// Use default content
						}

						return {
							id: `subnet_${index}_${
								isRegenerating ? "regenerated" : "done"
							}_${Date.now()}`,
							type: "workflow_subnet",
							content,
							timestamp: new Date(),
							subnetStatus: "done",
							toolName: subnet.toolName,
							subnetIndex: index,
							imageData: result.imageData,
							isImage: result.isImage,
							contentType: result.contentType,
							sourceId: isRegenerating
								? `${sourceId}_regenerated`
								: sourceId,
							isRegenerated: isRegenerating,
							contentHash,
						};
					}
					return null;

				case "waiting_response":
					if (subnet.data) {
						const result = parseAgentResponse(subnet.data);
						let content = result.content || "Processing data...";

						try {
							const parsedData = JSON.parse(subnet.data);
							if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							}
						} catch {
							// Use default content
						}

						return {
							id: `subnet_${index}_data_${Date.now()}`,
							type: "workflow_subnet",
							content,
							timestamp: new Date(),
							subnetStatus: "done",
							toolName: subnet.toolName,
							subnetIndex: index,
							imageData: result.imageData,
							isImage: result.isImage,
							contentType: result.contentType,
							sourceId: `${sourceId}_data`,
							contentHash: createContentHash(result),
						};
					} else {
						return {
							id: `subnet_${index}_${Date.now()}`,
							type: "workflow_subnet",
							content: "Waiting for response...",
							timestamp: new Date(),
							subnetStatus: "waiting_response",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: sourceId,
						};
					}

				case "failed":
					return {
						id: `subnet_${index}_${Date.now()}`,
						type: "workflow_subnet",
						content: "Failed to process",
						timestamp: new Date(),
						subnetStatus: "failed",
						toolName: subnet.toolName,
						subnetIndex: index,
						sourceId: sourceId,
					};

				default:
					return null;
			}
		},
		[]
	);

	// Create question message
	const createQuestionMessage = useCallback(
		(subnet: any, index: number): ChatMsg => {
			return {
				id: `question_${Date.now()}`,
				type: "question",
				content: subnet.question.text,
				timestamp: new Date(),
				toolName: subnet.toolName,
				questionData: subnet.question,
				sourceId: `question_${subnet.itemID}_${Date.now()}`,
				question: subnet.question.text,
				answer: "Waiting for user response",
			};
		},
		[]
	);

	// Create notification message
	const createNotificationMessage = useCallback(
		(subnet: any, index: number): ChatMsg => {
			return {
				id: `notification_${Date.now()}`,
				type: "notification",
				content: subnet.question.text,
				timestamp: new Date(),
				toolName: subnet.toolName,
				questionData: subnet.question,
				sourceId: `notification_${subnet.itemID}_${Date.now()}`,
			};
		},
		[]
	);

	// Get cached subnets for a workflow
	const getCachedSubnets = useCallback((workflowId: string) => {
		return useSubnetCacheStore.getState().getWorkflowSubnets(workflowId);
	}, []);

	// Check if subnet has specific data
	const hasSubnetData = useCallback(
		(workflowId: string, subnetIndex: number) => {
			const cached = getCachedSubnetData(workflowId, subnetIndex);
			return cached?.data && cached.status === "done";
		},
		[getCachedSubnetData]
	);

	return {
		processSubnetData,
		getCachedSubnets,
		hasSubnetData,
		clearWorkflowCache,
		clearWorkflowTracking,
		resetMessageTracking,
		updateSubnetStatus,
		// Expose tracking maps for external use if needed
		getWorkflowMaps,
	};
};
