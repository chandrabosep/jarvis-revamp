import { useState, useCallback, useRef } from "react";
import { ChatMsg } from "@/types/chat";
import { useSubnetCache } from "./use-subnet-cache";

export const useChatMessages = () => {
	const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
	const [pendingNotifications, setPendingNotifications] = useState<ChatMsg[]>(
		[]
	);

	const {
		processSubnetData,
		clearWorkflowCache,
		clearWorkflowTracking,
		getCachedSubnets,
	} = useSubnetCache();

	const currentWorkflowId = useRef<string | null>(null);

	const safeSetChatMessages = useCallback(
		(messages: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[])) => {
			setChatMessages(messages);
		},
		[]
	);

	const setChatMessagesWithWorkflowCheck = useCallback(
		(
			messages: ChatMsg[] | ((prev: ChatMsg[]) => ChatMsg[]),
			workflowId?: string
		) => {
			if (
				workflowId &&
				currentWorkflowId.current &&
				workflowId !== currentWorkflowId.current
			) {
				console.warn(
					`⚠️ Attempting to set messages for different workflow: ${workflowId} vs ${currentWorkflowId.current}`
				);
				return;
			}
			setChatMessages(messages);
		},
		[]
	);

	const updateMessagesWithSubnetData = useCallback(
		(data: any, lastQuestionRef: React.MutableRefObject<string | null>) => {
			const workflowId =
				data.requestId || data.workflowId || `workflow_${Date.now()}`;

			console.log(
				`🔄 Processing workflow: ${workflowId}, Current: ${currentWorkflowId.current}`
			);

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

			currentWorkflowId.current = workflowId;

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

			const isDuplicateMessage = (
				newMsg: ChatMsg,
				existingMsgs: ChatMsg[]
			) => {
				return existingMsgs.some((existingMsg) => {
					if (
						newMsg.type !== "workflow_subnet" ||
						existingMsg.type !== "workflow_subnet"
					) {
						return false;
					}

					// For workflow_subnet messages, only consider them duplicates if they have the same content AND status
					// This allows status updates (like "Processing..." -> "Completed") to show properly
					if (
						newMsg.subnetIndex === existingMsg.subnetIndex &&
						newMsg.toolName === existingMsg.toolName &&
						newMsg.subnetStatus === existingMsg.subnetStatus &&
						newMsg.content === existingMsg.content
					) {
						return true;
					}

					return false;
				});
			};

			setChatMessages((prevMessages) => {
				console.log(
					`🔄 Updating chat messages. Current: ${prevMessages.length}, New: ${newMessages.length}`
				);

				const messageTypes = prevMessages.map((msg) => ({
					type: msg.type,
					content: msg.content?.slice(0, 30),
				}));
				console.log(`📋 Current message types:`, messageTypes);

				const filteredMessages = prevMessages.filter((msg) => {
					// Always keep user and response messages
					if (msg.type === "user" || msg.type === "response") {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					// Always keep question and notification messages
					if (
						msg.type === "question" ||
						msg.type === "notification"
					) {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					// For workflow_subnet messages, be more selective about what to remove
					if (msg.type === "workflow_subnet") {
						// Keep messages that are not just status placeholders
						if (msg.subnetIndex !== undefined) {
							// Keep messages with actual content (not just status updates)
							if (
								msg.content &&
								!msg.content.includes("Processing") &&
								!msg.content.includes("Waiting for") &&
								!msg.content.includes("Queued for")
							) {
								console.log(
									`✅ Keeping subnet response ${
										msg.subnetIndex
									}: "${msg.content?.slice(0, 50)}..."`
								);
								return true;
							}

							// Check if there's a new message for this subnet that should replace processing messages
							const hasNewMessageForSubnet = newMessages.some(
								(newMsg) =>
									newMsg.type === "workflow_subnet" &&
									newMsg.subnetIndex === msg.subnetIndex &&
									(newMsg.subnetStatus === "done" ||
										newMsg.subnetStatus ===
											"waiting_response")
							);

							// Remove processing messages if there's a new completed/waiting message
							if (
								msg.subnetStatus === "in_progress" &&
								msg.content.includes("Processing") &&
								hasNewMessageForSubnet
							) {
								console.log(
									`🔄 Removing processing message for subnet ${msg.subnetIndex} - replaced by new message`
								);
								return false;
							}

							// Keep processing messages if they're still relevant (no replacement)
							if (
								msg.subnetStatus === "in_progress" &&
								msg.content.includes("Processing") &&
								!hasNewMessageForSubnet
							) {
								console.log(
									`✅ Keeping processing message for subnet ${msg.subnetIndex}`
								);
								return true;
							}

							// Keep waiting response messages if they're still relevant
							if (
								msg.subnetStatus === "waiting_response" &&
								msg.content.includes("Waiting for")
							) {
								console.log(
									`✅ Keeping waiting response message for subnet ${msg.subnetIndex}`
								);
								return true;
							}

							// Keep pending messages if they're still relevant
							if (
								msg.subnetStatus === "pending" &&
								msg.content.includes("Queued for")
							) {
								console.log(
									`✅ Keeping pending message for subnet ${msg.subnetIndex}`
								);
								return true;
							}

							// Keep pending messages with actual data content
							if (
								msg.subnetStatus === "pending" &&
								msg.content &&
								!msg.content.includes("Queued for")
							) {
								console.log(
									`✅ Keeping pending message with data for subnet ${
										msg.subnetIndex
									}: "${msg.content?.slice(0, 50)}..."`
								);
								return true;
							}

							// Debug: Log what's happening with pending messages
							if (msg.subnetStatus === "pending") {
								console.log(
									`🔍 Pending message debug for subnet ${msg.subnetIndex}:`,
									{
										content: msg.content?.slice(0, 100),
										includesQueued:
											msg.content?.includes("Queued for"),
										willKeep:
											msg.content &&
											!msg.content.includes("Queued for"),
									}
								);
							}

							// Remove old status update messages that are no longer relevant
							console.log(
								`🗑️ Removing old status update for subnet ${msg.subnetIndex}: "${msg.content}"`
							);
							return false;
						}

						// Keep global subnet messages
						console.log(
							`✅ Keeping global subnet message: "${msg.content?.slice(
								0,
								50
							)}..."`
						);
						return true;
					}

					// Keep all other message types
					console.log(
						`✅ Keeping ${msg.type} message: "${msg.content?.slice(
							0,
							50
						)}..."`
					);
					return true;
				});

				console.log(
					`📊 After filtering: ${filteredMessages.length} messages preserved`
				);

				const uniqueNewMessages = newMessages.filter(
					(newMsg) => !isDuplicateMessage(newMsg, filteredMessages)
				);

				console.log(
					`📝 Adding ${uniqueNewMessages.length} unique new messages`
				);

				const finalMessages = [
					...filteredMessages,
					...uniqueNewMessages,
				].sort((a, b) => {
					// Sort messages by timestamp to ensure proper ordering
					const timeA = a.timestamp
						? new Date(a.timestamp).getTime()
						: 0;
					const timeB = b.timestamp
						? new Date(b.timestamp).getTime()
						: 0;
					return timeA - timeB;
				});

				if (finalMessages.length === 0 && prevMessages.length > 0) {
					console.warn(
						`⚠️ All messages were filtered out! Keeping original messages.`
					);
					return prevMessages;
				}

				console.log(`✅ Final message count: ${finalMessages.length}`);
				console.log(
					`🔍 Final message types:`,
					finalMessages.map((msg) => ({
						type: msg.type,
						content: msg.content?.slice(0, 50),
						subnetStatus: msg.subnetStatus,
						toolName: msg.toolName,
					}))
				);
				return finalMessages;
			});

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

		if (currentWorkflowId.current) {
			console.log(
				`🗑️ Clearing workflow tracking and cache for: ${currentWorkflowId.current}`
			);
			clearWorkflowTracking(currentWorkflowId.current);
			clearWorkflowCache(currentWorkflowId.current);

			import("@/utils/chat-utils").then(({ clearChatCache }) => {
				clearChatCache(currentWorkflowId.current!);
			});

			currentWorkflowId.current = null;
		}
	}, [clearWorkflowTracking, clearWorkflowCache, chatMessages.length]);

	const resetFeedbackState = useCallback(() => {
		console.log("🔄 Resetting feedback state");
		// Clear any pending feedback-related state
		setPendingNotifications([]);
	}, []);

	const getCurrentWorkflowSubnets = useCallback(() => {
		if (!currentWorkflowId.current) return new Map();
		return getCachedSubnets(currentWorkflowId.current);
	}, [getCachedSubnets]);

	const setWorkflowId = useCallback(
		(workflowId: string) => {
			console.log(
				`🔄 Setting workflow ID: ${workflowId}, Current: ${currentWorkflowId.current}`
			);

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
		safeSetChatMessages,
		setChatMessagesWithWorkflowCheck,
		pendingNotifications,
		setPendingNotifications,
		updateMessagesWithSubnetData,
		clearMessages,
		resetFeedbackState,
		getCurrentWorkflowSubnets,
		setWorkflowId,
		currentWorkflowId: currentWorkflowId.current,
	};
};
