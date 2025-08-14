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

				// Special logging for pending subnets with data
				if (subnet.status === "pending" && subnet.data) {
					console.log(
						`🔄 Pending subnet ${index} has data - will generate message`
					);
					console.log(`🔍 Pending subnet ${index} data structure:`, {
						dataType: typeof subnet.data,
						dataLength: subnet.data?.length || 0,
						dataPreview: subnet.data?.slice(0, 200) || "no-data",
						parsedData: (() => {
							try {
								return JSON.parse(subnet.data);
							} catch (e) {
								return "Failed to parse JSON";
							}
						})(),
					});
				}

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
				// Always generate messages for new subnets or changed subnets
				// Also always generate messages for pending subnets with data (they should be visible)
				const shouldGenerateMessage =
					hasChanged ||
					!prevStatus ||
					(subnet.status === "pending" && subnet.data);

				if (shouldGenerateMessage) {
					console.log(
						`✨ Generating message for subnet ${index} (changed: ${hasChanged}, new: ${!prevStatus}, pending with data: ${
							subnet.status === "pending" && subnet.data
						})`
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
						// For pending subnets with data, use a more specific key to avoid incorrect deduplication
						let messageKey;
						if (subnet.status === "pending" && subnet.data) {
							messageKey = `${workflowId}_${index}_pending_with_data_${JSON.stringify(
								subnet.data
							).slice(0, 100)}`;
						} else {
							messageKey = `${workflowId}_${index}_${
								subnet.status
							}_${
								subnet.data
									? JSON.stringify(subnet.data).slice(0, 100)
									: "no-data"
							}`;
						}

						console.log(
							`🔑 Message key for subnet ${index}:`,
							messageKey
						);
						console.log(
							`🔍 Checking if message exists:`,
							messageIds.has(messageKey)
						);

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
					// Show questions for pending subnets with data, or when there are status transitions
					const shouldShowQuestion =
						subnet.question &&
						(hasChanged ||
							isShowingQuestion ||
							(subnet.status === "pending" && subnet.data));

					if (shouldShowQuestion) {
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
							`⚠️ Question exists for subnet ${index} but not generating: hasChanged=${hasChanged}, isShowingQuestion=${isShowingQuestion}, pendingWithData=${
								subnet.status === "pending" && subnet.data
							}`
						);
					}

					// Handle notifications with deduplication
					// Show notifications for pending subnets with data, or when there are status transitions
					const shouldShowNotification =
						subnet.question?.type === "notification" &&
						(hasChanged ||
							isShowingQuestion ||
							(subnet.status === "pending" && subnet.data));

					if (shouldShowNotification) {
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
			console.log(
				`🔍 Final messages:`,
				messages.map((msg) => ({
					type: msg.type,
					content: msg.content?.slice(0, 50),
					subnetStatus: msg.subnetStatus,
					toolName: msg.toolName,
				}))
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
					// Show pending subnets with data if available, otherwise show status message
					if (subnet.data) {
						console.log(
							`🔍 Creating pending message with data for subnet ${index}:`,
							{
								rawData: subnet.data,
								dataType: typeof subnet.data,
								dataLength: subnet.data.length,
							}
						);

						const result = parseAgentResponse(subnet.data);
						console.log(
							`🔍 Parsed result for pending subnet ${index}:`,
							{
								content: result.content?.slice(0, 100),
								hasImageData: !!result.imageData,
								contentType: result.contentType,
							}
						);

						let content =
							result.content || "Queued for processing...";

						// Handle special data formats and nested structures
						try {
							const parsedData = JSON.parse(subnet.data);

							// Check for nested data structure (like in subnet 3)
							if (parsedData.data && parsedData.data.message) {
								content = parsedData.data.message;
								console.log(
									`🔍 Found nested data.message for pending subnet ${index}:`,
									content?.slice(0, 100)
								);
							} else if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							} else if (parsedData.message) {
								content = parsedData.message;
								console.log(
									`🔍 Found data.message for pending subnet ${index}:`,
									content?.slice(0, 100)
								);
							}
						} catch (e) {
							console.log(
								`⚠️ Failed to parse JSON for pending subnet ${index}:`,
								e
							);
							// Use default content from parseAgentResponse
						}

						console.log(
							`🔍 Final content for pending subnet ${index}:`,
							content?.slice(0, 100)
						);

						return {
							id: `subnet_${index}_pending_with_data_${Date.now()}`,
							type: "workflow_subnet",
							content,
							timestamp: new Date(),
							subnetStatus: "pending",
							toolName: subnet.toolName,
							subnetIndex: index,
							imageData: result.imageData,
							isImage: result.isImage,
							contentType: result.contentType,
							sourceId: `${sourceId}_pending_with_data`,
							contentHash: createContentHash(result),
						};
					} else {
						// No data available, show status message
						return {
							id: `subnet_${index}_pending_${Date.now()}`,
							type: "workflow_subnet",
							content: "Queued for processing...",
							timestamp: new Date(),
							subnetStatus: "pending",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: `${sourceId}_pending`,
						};
					}

				case "in_progress":
					if (isProcessingAfterFeedback) {
						return {
							id: `subnet_${index}_processing_after_feedback_${Date.now()}`,
							type: "workflow_subnet",
							content: "Processing with your feedback...",
							timestamp: new Date(),
							subnetStatus: "in_progress",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: `${sourceId}_processing_after_feedback`,
							isRegenerated: true,
						};
					} else {
						return {
							id: `subnet_${index}_processing_${Date.now()}`,
							type: "workflow_subnet",
							content: `Processing with ${
								subnet.toolName || "agent"
							}...`,
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
							id: `subnet_${index}_waiting_${Date.now()}`,
							type: "workflow_subnet",
							content: `Waiting for your response...`,
							timestamp: new Date(),
							subnetStatus: "waiting_response",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: sourceId,
						};
					}

				case "failed":
					return {
						id: `subnet_${index}_failed_${Date.now()}`,
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
				subnetStatus: subnet.status, // Add subnet status to link question to subnet
				subnetIndex: index, // Add subnet index to link question to subnet
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
				subnetStatus: subnet.status, // Add subnet status to link notification to subnet
				subnetIndex: index, // Add subnet index to link notification to subnet
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
