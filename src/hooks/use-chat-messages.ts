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

					if (
						newMsg.subnetIndex === existingMsg.subnetIndex &&
						newMsg.toolName === existingMsg.toolName
					) {
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

						if (newIsStatusUpdate && existingIsStatusUpdate) {
							return true;
						}

						if (existingIsStatusUpdate && !newIsStatusUpdate) {
							return false;
						}

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
					if (msg.type === "user" || msg.type === "response") {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					if (msg.type !== "workflow_subnet") {
						console.log(
							`✅ Keeping ${
								msg.type
							} message: "${msg.content?.slice(0, 50)}..."`
						);
						return true;
					}

					if (msg.subnetIndex !== undefined) {
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
							return true;
						}
					}

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

				const uniqueNewMessages = newMessages.filter(
					(newMsg) => !isDuplicateMessage(newMsg, filteredMessages)
				);

				console.log(
					`📝 Adding ${uniqueNewMessages.length} unique new messages`
				);

				const finalMessages = [
					...filteredMessages,
					...uniqueNewMessages,
				];

				if (finalMessages.length === 0 && prevMessages.length > 0) {
					console.warn(
						`⚠️ All messages were filtered out! Keeping original messages.`
					);
					return prevMessages;
				}

				console.log(`✅ Final message count: ${finalMessages.length}`);
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

	const resetFeedbackState = useCallback(() => {}, []);

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
