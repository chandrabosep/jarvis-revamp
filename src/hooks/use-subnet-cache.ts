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
				// Only generate messages when:
				// 1. Status has actually changed (not just new/unchanged)
				// 2. Moving from pending to in_progress (start processing)
				// 3. Moving from in_progress to done/waiting_response (has meaningful data)
				// 4. Pending subnets with substantial data (not just status messages)
				const hasSubstantialData =
					subnet.data &&
					subnet.data.length > 50 &&
					!subnet.data.includes("Queued for processing") &&
					!subnet.data.includes("Processing with");

				const shouldGenerateMessage =
					(hasChanged && prevStatus) || // Status changed from a previous state
					(subnet.status === "in_progress" &&
						prevStatus === "pending") || // Start processing
					(subnet.status === "done" && subnet.data) || // Completed with data
					(subnet.status === "waiting_response" && subnet.data) || // Has data and waiting for response
					(subnet.status === "pending" && hasSubstantialData) || // Pending with real data
					(prevStatus === "in_progress" &&
						subnet.status !== "in_progress"); // Transition away from processing

				if (shouldGenerateMessage) {
					console.log(
						`✨ Generating message for subnet ${index} (changed: ${hasChanged}, transition: ${prevStatus} -> ${subnet.status}, hasSubstantialData: ${hasSubstantialData})`
					);

					// Create messages for data and questions separately when both exist
					const subnetMessages = createSubnetMessages(
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

					subnetMessages.forEach((message) => {
						if (message) {
							// Check if this message has already been generated
							// Use message type and content for better deduplication
							let messageKey;
							if (message.type === "question") {
								messageKey = `${workflowId}_${index}_question_${message.content?.slice(
									0,
									50
								)}`;
							} else if (
								subnet.status === "pending" &&
								subnet.data
							) {
								messageKey = `${workflowId}_${index}_pending_with_data_${JSON.stringify(
									subnet.data
								).slice(0, 100)}`;
							} else {
								messageKey = `${workflowId}_${index}_${
									message.type
								}_${subnet.status}_${
									subnet.data
										? JSON.stringify(subnet.data).slice(
												0,
												100
										  )
										: "no-data"
								}`;
							}

							console.log(
								`🔑 Message key for subnet ${index}:`,
								messageKey
							);

							if (!messageIds.has(messageKey)) {
								messages.push(message);
								messageIds.add(messageKey);
								console.log(
									`✅ Message generated for subnet ${index}:`,
									message.type,
									`Content: "${message.content?.slice(
										0,
										50
									)}..."`
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
					});

					// Questions are now handled within createSubnetMessages function

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
	const createSubnetMessages = useCallback(
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
		): ChatMsg[] => {
			const {
				isRegenerating,
				isShowingQuestion,
				hasFeedback,
				isProcessingAfterFeedback,
			} = options;
			const sourceId = `subnet_${index}_${subnet.status}`;
			const messages: ChatMsg[] = [];

			// Helper function to extract question data from subnet
			const extractQuestionData = (subnetData: string) => {
				try {
					const parsedData = JSON.parse(subnetData);
					if (
						parsedData.question ||
						(parsedData.data && parsedData.data.question)
					) {
						const questionText =
							parsedData.question || parsedData.data.question;

						if (
							typeof questionText === "object" &&
							questionText.text
						) {
							return questionText;
						} else if (typeof questionText === "string") {
							return {
								type: "feedback",
								text: questionText,
								itemID: Date.now(),
								expiresAt: new Date(
									Date.now() + 30 * 60 * 1000
								).toISOString(),
							};
						}
					}
				} catch (e) {
					// Ignore parsing errors
				}
				return null;
			};

			switch (subnet.status) {
				case "pending":
					// Only show pending subnets if they have substantial data
					if (
						subnet.data &&
						subnet.data.length > 50 &&
						!subnet.data.includes("Queued for processing") &&
						!subnet.data.includes("Processing with")
					) {
						console.log(
							`🔍 Creating pending message with substantial data for subnet ${index}:`,
							{
								rawData: subnet.data,
								dataType: typeof subnet.data,
								dataLength: subnet.data.length,
							}
						);

						const result = parseAgentResponse(subnet.data);
						let content = result.content || "";

						// Handle special data formats and nested structures
						try {
							const parsedData = JSON.parse(subnet.data);

							// Check for nested data structure (like in subnet 3)
							if (parsedData.data && parsedData.data.message) {
								content = parsedData.data.message;
							} else if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							} else if (parsedData.message) {
								content = parsedData.message;
							}
						} catch (e) {
							console.log(
								`⚠️ Failed to parse JSON for pending subnet ${index}:`,
								e
							);
						}

						// Only add message if we have meaningful content
						if (content && content.length > 10) {
							const dataMessage = {
								id: `subnet_${index}_data_${Date.now()}`,
								type: "workflow_subnet" as const,
								content,
								timestamp: new Date(),
								subnetStatus: "done" as const, // Show as completed since it has data
								toolName: subnet.toolName,
								subnetIndex: index,
								imageData: result.imageData,
								isImage: result.isImage,
								contentType: result.contentType,
								sourceId: `${sourceId}_data`,
								contentHash: createContentHash(result),
							};
							messages.push(dataMessage);

							// Check for questions in the data
							const questionData = extractQuestionData(
								subnet.data
							);
							if (questionData) {
								const questionMessage = {
									id: `subnet_${index}_question_${Date.now()}`,
									type: "question" as const,
									content: questionData.text,
									timestamp: new Date(),
									subnetStatus: "waiting_response" as const,
									toolName: subnet.toolName,
									subnetIndex: index,
									questionData: questionData,
									sourceId: `${sourceId}_question`,
								};
								messages.push(questionMessage);
							}
						}
					}
					break;

				case "in_progress":
					if (isProcessingAfterFeedback) {
						messages.push({
							id: `subnet_${index}_processing_after_feedback_${Date.now()}`,
							type: "workflow_subnet",
							content: "Processing with your feedback...",
							timestamp: new Date(),
							subnetStatus: "in_progress",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: `${sourceId}_processing_after_feedback`,
							isRegenerated: true,
						});
					} else {
						messages.push({
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
						});
					}
					break;

				case "done":
					if (subnet.data) {
						const result = parseAgentResponse(subnet.data);
						const contentHash = createContentHash(result);

						let content = result.content || "";
						let hasQuestion = false;
						let questionContent = "";

						// Handle special data formats and extract questions
						try {
							const parsedData = JSON.parse(subnet.data);

							// Check for nested data structure
							if (parsedData.data && parsedData.data.message) {
								content = parsedData.data.message;
							} else if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							} else if (parsedData.message) {
								content = parsedData.message;
							}

							// Check for questions in the data
							if (
								parsedData.question ||
								(parsedData.data && parsedData.data.question)
							) {
								hasQuestion = true;
								questionContent =
									parsedData.question ||
									parsedData.data.question;
							}
						} catch {
							// Use default content
						}

						// If we have both data and question, prioritize showing data first
						if (content || result.imageData) {
							const dataMessage = {
								id: `subnet_${index}_data_${Date.now()}`,
								type: "workflow_subnet" as const,
								content: content || "Data received",
								timestamp: new Date(),
								subnetStatus: "done" as const,
								toolName: subnet.toolName,
								subnetIndex: index,
								imageData: result.imageData,
								isImage: result.isImage,
								contentType: result.contentType,
								sourceId: `${sourceId}_data`,
								isRegenerated: isRegenerating,
								contentHash,
							};
							messages.push(dataMessage);

							// Check for questions in the data and add them as separate messages
							const questionData = extractQuestionData(
								subnet.data
							);
							if (questionData) {
								const questionMessage = {
									id: `subnet_${index}_question_${Date.now()}`,
									type: "question" as const,
									content: questionData.text,
									timestamp: new Date(),
									subnetStatus: "waiting_response" as const,
									toolName: subnet.toolName,
									subnetIndex: index,
									questionData: questionData,
									sourceId: `${sourceId}_question`,
								};
								messages.push(questionMessage);
							}
						}
					}
					break;

				case "waiting_response":
					if (subnet.data) {
						const result = parseAgentResponse(subnet.data);
						let content = result.content || "";
						let hasQuestion = false;
						let questionData = null;

						// Handle special data formats and extract questions
						try {
							const parsedData = JSON.parse(subnet.data);

							// Check for nested data structure
							if (parsedData.data && parsedData.data.message) {
								content = parsedData.data.message;
							} else if (
								parsedData.enhancedPrompt &&
								parsedData.originalPrompt
							) {
								content = "Prompt enhancement detected";
							} else if (parsedData.message) {
								content = parsedData.message;
							}

							// Check for questions in the data
							if (
								parsedData.question ||
								(parsedData.data && parsedData.data.question)
							) {
								hasQuestion = true;
								const questionText =
									parsedData.question ||
									parsedData.data.question;

								// Extract question data if it's structured
								if (
									typeof questionText === "object" &&
									questionText.text
								) {
									questionData = questionText;
								} else if (typeof questionText === "string") {
									questionData = {
										type: "feedback",
										text: questionText,
										itemID: Date.now(),
										expiresAt: new Date(
											Date.now() + 30 * 60 * 1000
										).toISOString(), // 30 minutes
									};
								}
							}
						} catch {
							// Use default content
						}

						// For waiting_response, prioritize questions over data
						// If there's a question, show the question first, then data
						if (hasQuestion && questionData) {
							// Show the question message
							const questionMessage = {
								id: `subnet_${index}_question_${Date.now()}`,
								type: "question" as const,
								content: questionData.text,
								timestamp: new Date(),
								subnetStatus: "waiting_response" as const,
								toolName: subnet.toolName,
								subnetIndex: index,
								questionData: questionData,
								sourceId: `${sourceId}_question`,
							};
							messages.push(questionMessage);

							// Also show data if available (but after the question)
							if (content || result.imageData) {
								const dataMessage = {
									id: `subnet_${index}_data_${Date.now()}`,
									type: "workflow_subnet" as const,
									content: content || "Data received",
									timestamp: new Date(),
									subnetStatus: "done" as const,
									toolName: subnet.toolName,
									subnetIndex: index,
									imageData: result.imageData,
									isImage: result.isImage,
									contentType: result.contentType,
									sourceId: `${sourceId}_data`,
									contentHash: createContentHash(result),
								};
								messages.push(dataMessage);
							}
						} else if (content || result.imageData) {
							// No question, just show data as completed
							const dataMessage = {
								id: `subnet_${index}_data_${Date.now()}`,
								type: "workflow_subnet" as const,
								content: content || "Data received",
								timestamp: new Date(),
								subnetStatus: "done" as const,
								toolName: subnet.toolName,
								subnetIndex: index,
								imageData: result.imageData,
								isImage: result.isImage,
								contentType: result.contentType,
								sourceId: `${sourceId}_data`,
								contentHash: createContentHash(result),
							};
							messages.push(dataMessage);
						}
					} else {
						// No data, just waiting
						messages.push({
							id: `subnet_${index}_waiting_${Date.now()}`,
							type: "workflow_subnet",
							content: `Waiting for your response...`,
							timestamp: new Date(),
							subnetStatus: "waiting_response",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: sourceId,
						});
					}
					break;

				case "failed":
					messages.push({
						id: `subnet_${index}_failed_${Date.now()}`,
						type: "workflow_subnet",
						content: "Failed to process",
						timestamp: new Date(),
						subnetStatus: "failed",
						toolName: subnet.toolName,
						subnetIndex: index,
						sourceId: sourceId,
					});
					break;

				default:
					break;
			}

			return messages;
		},
		[parseAgentResponse, createContentHash]
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
