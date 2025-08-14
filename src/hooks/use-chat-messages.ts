import { useState, useCallback, useRef } from "react";
import { ChatMsg } from "@/types/chat";
import { useSubnetCache } from "./use-subnet-cache";

export const useChatMessages = () => {
	const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
	const [pendingNotifications, setPendingNotifications] = useState<ChatMsg[]>(
		[]
	);

	// Use the new subnet caching system
	const {
		processSubnetData,
		clearWorkflowCache,
		clearWorkflowTracking,
		getCachedSubnets,
	} = useSubnetCache();

	// Track current workflow ID for caching
	const currentWorkflowId = useRef<string | null>(null);

	const updateMessagesWithSubnetData = useCallback(
		(data: any, lastQuestionRef: React.MutableRefObject<string | null>) => {
			const workflowId =
				data.requestId || data.workflowId || `workflow_${Date.now()}`;

			console.log(
				`🔄 Processing workflow: ${workflowId}, Current: ${currentWorkflowId.current}`
			);

			// Clear previous workflow cache if switching
			if (
				currentWorkflowId.current &&
				currentWorkflowId.current !== workflowId
			) {
				console.log(
					`🔄 Switching workflows: ${currentWorkflowId.current} -> ${workflowId}`
				);
				clearWorkflowTracking(currentWorkflowId.current);
				clearWorkflowCache(currentWorkflowId.current);
			}

			// Set current workflow ID
			currentWorkflowId.current = workflowId;

			// Process subnet data using the new caching system
			const newMessages = processSubnetData(
				workflowId,
				data.subnets,
				lastQuestionRef
			);

			console.log(`🔍 Subnet data processing results:`, {
				subnetCount: data.subnets?.length || 0,
				newMessageCount: newMessages.length,
				newMessageTypes: newMessages.map((msg) => ({
					type: msg.type,
					content: msg.content?.slice(0, 50),
				})),
			});

			// Helper function to check if a message is a duplicate
			const isDuplicateMessage = (
				newMsg: ChatMsg,
				existingMsgs: ChatMsg[]
			) => {
				return existingMsgs.some((existingMsg) => {
					// Only check for exact duplicates of workflow subnet messages
					// User messages, responses, and other types should not be considered duplicates
					if (
						newMsg.type !== "workflow_subnet" ||
						existingMsg.type !== "workflow_subnet"
					) {
						return false;
					}

					// For subnet messages, check if they're truly duplicates
					if (
						newMsg.subnetIndex === existingMsg.subnetIndex &&
						newMsg.toolName === existingMsg.toolName
					) {
						// Check if both are status updates (these can be replaced)
						const newIsStatusUpdate =
							newMsg.content === "Processing..." ||
							newMsg.content === "Waiting for response..." ||
							newMsg.content === "Failed to process" ||
							newMsg.subnetStatus === "pending" ||
							newMsg.subnetStatus === "in_progress";

						const existingIsStatusUpdate =
							existingMsg.content === "Processing..." ||
							existingMsg.content === "Waiting for response..." ||
							existingMsg.content === "Failed to process" ||
							existingMsg.subnetStatus === "pending" ||
							existingMsg.subnetStatus === "in_progress";

						// If both are status updates, consider them duplicates
						if (newIsStatusUpdate && existingIsStatusUpdate) {
							return true;
						}

						// If existing is a status update and new has actual content, allow replacement
						if (existingIsStatusUpdate && !newIsStatusUpdate) {
							return false;
						}

						// If both have actual content, check if they're truly the same
						if (!newIsStatusUpdate && !existingIsStatusUpdate) {
							return (
								newMsg.content === existingMsg.content &&
								newMsg.subnetStatus === existingMsg.subnetStatus
							);
						}
					}

					return false;
				});
			};

			// Update chat messages
			setChatMessages((prevMessages) => {
				console.log(
					`🔄 Updating chat messages. Current: ${prevMessages.length}, New: ${newMessages.length}`
				);

				// Debug: Show current message types
				const messageTypes = prevMessages.map((msg) => ({
					type: msg.type,
					content: msg.content?.slice(0, 30),
				}));
				console.log(`📋 Current message types:`, messageTypes);

				// Remove only workflow subnet messages for this workflow to prevent duplicates
				// Keep user messages, responses, and other non-subnet messages
				const filteredMessages = prevMessages.filter((msg) => {
					// Always keep user messages and responses
					if (msg.type === "user" || msg.type === "response") {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					// Keep all non-subnet messages (questions, notifications, etc.)
					if (msg.type !== "workflow_subnet") {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					// For workflow subnet messages, we need to be more selective
					// Only remove status update messages, keep actual content responses
					if (msg.subnetIndex !== undefined) {
						// Check if this is just a status update or actual content
						const isStatusUpdate =
							msg.content === "Processing..." ||
							msg.content === "Waiting for response..." ||
							msg.content === "Failed to process" ||
							msg.subnetStatus === "pending" ||
							msg.subnetStatus === "in_progress";

						if (isStatusUpdate) {
							console.log(
								`🗑️ Removing status update for subnet ${msg.subnetIndex}: "${msg.content}"`
							);
							return false;
						} else {
							console.log(
								`✅ Keeping subnet response ${
									msg.subnetIndex
								}: "${msg.content?.slice(0, 50)}..."`
							);
							return true; // Keep actual content responses
						}
					}

					// Keep subnet messages without subnetIndex (global messages)
					console.log(
						`✅ Keeping global subnet message: "${msg.content?.slice(
							0,
							50
						)}..."`
					);
					return true;
				});

				console.log(
					`📊 After filtering: ${filteredMessages.length} messages preserved`
				);

				// Filter out duplicate messages from new messages
				const uniqueNewMessages = newMessages.filter(
					(newMsg) => !isDuplicateMessage(newMsg, filteredMessages)
				);

				console.log(
					`📝 Adding ${uniqueNewMessages.length} unique new messages`
				);

				// Add new unique messages
				const finalMessages = [
					...filteredMessages,
					...uniqueNewMessages,
				];

				// Safety check: if we somehow lost all messages, keep the original ones
				if (finalMessages.length === 0 && prevMessages.length > 0) {
					console.warn(
						`⚠️ All messages were filtered out! Keeping original messages.`
					);
					return prevMessages;
				}

				console.log(`✅ Final message count: ${finalMessages.length}`);
				return finalMessages;
			});

			// Update pending notifications
			const notificationMessages = newMessages.filter(
				(msg) => msg.type === "notification"
			);
			if (notificationMessages.length > 0) {
				setPendingNotifications((prev) => [
					...prev,
					...notificationMessages,
				]);
			}
		},
		[processSubnetData, clearWorkflowCache, clearWorkflowTracking]
	);

	const clearMessages = useCallback(() => {
		console.log(
			`🗑️ Clearing all messages. Current count: ${chatMessages.length}`
		);
		setChatMessages([]);
		setPendingNotifications([]);

		// Clear current workflow tracking and cache
		if (currentWorkflowId.current) {
			console.log(
				`🗑️ Clearing workflow tracking and cache for: ${currentWorkflowId.current}`
			);
			clearWorkflowTracking(currentWorkflowId.current);
			clearWorkflowCache(currentWorkflowId.current);
			currentWorkflowId.current = null;
		}
	}, [clearWorkflowTracking, clearWorkflowCache, chatMessages.length]);

	const resetFeedbackState = useCallback(() => {
		// Feedback state is now handled by the subnet cache system
		// This function is kept for backward compatibility
	}, []);

	// Get cached subnets for current workflow
	const getCurrentWorkflowSubnets = useCallback(() => {
		if (!currentWorkflowId.current) return new Map();
		return getCachedSubnets(currentWorkflowId.current);
	}, [getCachedSubnets]);

	// Set workflow ID (useful when switching between workflows)
	const setWorkflowId = useCallback(
		(workflowId: string) => {
			console.log(
				`🔄 Setting workflow ID: ${workflowId}, Current: ${currentWorkflowId.current}`
			);

			// Clear previous workflow tracking and cache
			if (
				currentWorkflowId.current &&
				currentWorkflowId.current !== workflowId
			) {
				console.log(
					`🔄 Clearing previous workflow: ${currentWorkflowId.current}`
				);
				clearWorkflowTracking(currentWorkflowId.current);
				clearWorkflowCache(currentWorkflowId.current);
			}

			currentWorkflowId.current = workflowId;
			console.log(`✅ Workflow ID set to: ${workflowId}`);
		},
		[clearWorkflowTracking, clearWorkflowCache]
	);

	return {
		chatMessages,
		setChatMessages,
		pendingNotifications,
		setPendingNotifications,
		updateMessagesWithSubnetData,
		clearMessages,
		resetFeedbackState,
		// New methods for subnet caching
		getCurrentWorkflowSubnets,
		setWorkflowId,
		currentWorkflowId: currentWorkflowId.current,
	};
};
