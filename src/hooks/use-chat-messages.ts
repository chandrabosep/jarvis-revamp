import { useState, useCallback } from "react";
import { ChatMsg, StatusTransition, FeedbackState } from "@/types/chat";
import { parseAgentResponse, createContentHash } from "@/utils/message-parser";

export const useChatMessages = () => {
	const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
	const [pendingNotifications, setPendingNotifications] = useState<ChatMsg[]>(
		[]
	);

	// Feedback state management
	const [preFeedbackContent, setPreFeedbackContent] = useState<
		Map<number, string>
	>(new Map());
	const [feedbackGivenForSubnet, setFeedbackGivenForSubnet] = useState<
		Set<number>
	>(new Set());
	const [subnetPreviousStatus, setSubnetPreviousStatus] = useState<
		Map<number, string>
	>(new Map());
	const [postFeedbackProcessing, setPostFeedbackProcessing] = useState<
		Map<number, boolean>
	>(new Map());

	const updateMessagesWithSubnetData = useCallback(
		(data: any, lastQuestionRef: React.MutableRefObject<string | null>) => {
			if (
				!data ||
				!Array.isArray(data.subnets) ||
				data.subnets.length === 0
			) {
				return;
			}

			const statusTransitions: Map<number, StatusTransition> = new Map();

			// Calculate status transitions
			data.subnets.forEach((subnet: any, index: number) => {
				const prevStatus = subnetPreviousStatus.get(index);
				const isRegenerating =
					prevStatus === "waiting_response" &&
					subnet.status === "in_progress";
				const isShowingQuestion =
					prevStatus === "in_progress" &&
					subnet.status === "waiting_response";

				statusTransitions.set(index, {
					prev: prevStatus,
					current: subnet.status,
					isRegenerating,
					isShowingQuestion,
				});

				if (isRegenerating) {
					console.log(
						`Subnet ${index} transitioning from waiting_response to in_progress - will regenerate`
					);
					setPostFeedbackProcessing((prev) =>
						new Map(prev).set(index, true)
					);
					setFeedbackGivenForSubnet((prev) =>
						new Set(prev).add(index)
					);
				}

				if (isShowingQuestion) {
					console.log(
						`Subnet ${index} transitioning from in_progress to waiting_response - will show question UI with new data`
					);
				}

				setSubnetPreviousStatus((prev) =>
					new Map(prev).set(index, subnet.status)
				);
			});

			setChatMessages((prevMessages) => {
				let updatedMessages = [...prevMessages];

				data.subnets.forEach((subnet: any, index: number) => {
					const sourceId = `subnet_${index}_${subnet.status}`;
					const transition = statusTransitions.get(index);
					const isRegenerating = transition?.isRegenerating || false;
					const isShowingQuestion =
						transition?.isShowingQuestion || false;

					let existingMessageIndex = updatedMessages.findIndex(
						(msg) =>
							msg.type === "workflow_subnet" &&
							msg.subnetIndex === index &&
							!msg.isRegenerated
					);

					if (subnet.status === "pending") {
						if (existingMessageIndex >= 0) {
							updatedMessages.splice(existingMessageIndex, 1);
						}
					} else if (subnet.status === "in_progress") {
						// Filter out old messages
						updatedMessages = updatedMessages.filter((msg) => {
							if (
								msg.type === "answer" &&
								msg.subnetIndex === index
							)
								return false;
							if (
								(msg.type === "question" ||
									msg.type === "notification") &&
								msg.questionData?.itemID === subnet.itemID
							)
								return false;
							if (msg.answer && msg.subnetIndex === index)
								return false;
							return true;
						});

						const isProcessingAfterFeedback =
							isRegenerating ||
							postFeedbackProcessing.get(index) ||
							false;

						if (isProcessingAfterFeedback) {
							console.log(
								`Showing processing after feedback for subnet ${index}`
							);
							updatedMessages = updatedMessages.filter((msg) => {
								if (
									msg.type === "workflow_subnet" &&
									msg.subnetIndex === index &&
									!msg.isRegenerated
								)
									return false;
								if (
									(msg.type === "question" ||
										msg.type === "notification") &&
									msg.questionData?.itemID === subnet.itemID
								)
									return false;
								if (
									msg.type === "answer" &&
									msg.subnetIndex === index
								)
									return false;
								return true;
							});

							const processingMessage: ChatMsg = {
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

							updatedMessages.push(processingMessage);
						} else {
							const progressMessage: ChatMsg = {
								id: `subnet_${index}_${Date.now()}`,
								type: "workflow_subnet",
								content: "Processing...",
								timestamp: new Date(),
								subnetStatus: "in_progress",
								toolName: subnet.toolName,
								subnetIndex: index,
								sourceId: sourceId,
							};

							if (existingMessageIndex >= 0) {
								updatedMessages[existingMessageIndex] =
									progressMessage;
							} else {
								updatedMessages.push(progressMessage);
							}
						}
					} else if (subnet.status === "done" && subnet.data) {
						const result = parseAgentResponse(subnet.data);
						const currentHash = createContentHash(result);

						const previousHash = preFeedbackContent.get(index);
						const hadFeedback = feedbackGivenForSubnet.has(index);
						const wasProcessingAfterFeedback =
							postFeedbackProcessing.get(index) || false;

						if (hadFeedback && wasProcessingAfterFeedback) {
							const processingIndex = updatedMessages.findIndex(
								(msg) =>
									msg.type === "workflow_subnet" &&
									msg.subnetIndex === index &&
									msg.subnetStatus === "in_progress" &&
									msg.isRegenerated
							);

							const regeneratedMessage: ChatMsg = {
								id: `subnet_${index}_regenerated_${Date.now()}`,
								type: "workflow_subnet",
								content:
									result.content || "Processing completed",
								timestamp: new Date(),
								subnetStatus: "done",
								toolName: subnet.toolName,
								subnetIndex: index,
								imageData: result.imageData,
								isImage: result.isImage,
								contentType: result.contentType,
								sourceId: `${sourceId}_regenerated`,
								isRegenerated: true,
								contentHash: currentHash,
							};

							if (processingIndex >= 0) {
								updatedMessages[processingIndex] =
									regeneratedMessage;
							} else {
								updatedMessages.push(regeneratedMessage);
							}

							setFeedbackGivenForSubnet((prev) => {
								const newSet = new Set(prev);
								newSet.delete(index);
								return newSet;
							});
							setPostFeedbackProcessing((prev) => {
								const newMap = new Map(prev);
								newMap.delete(index);
								return newMap;
							});
						} else if (!hadFeedback) {
							const doneMessage: ChatMsg = {
								id: `subnet_${index}_${Date.now()}`,
								type: "workflow_subnet",
								content:
									result.content || "Processing completed",
								timestamp: new Date(),
								subnetStatus: "done",
								toolName: subnet.toolName,
								subnetIndex: index,
								imageData: result.imageData,
								isImage: result.isImage,
								contentType: result.contentType,
								sourceId: sourceId,
								contentHash: currentHash,
							};

							if (existingMessageIndex >= 0) {
								updatedMessages[existingMessageIndex] =
									doneMessage;
							} else {
								updatedMessages.push(doneMessage);
							}
						} else {
							setFeedbackGivenForSubnet((prev) => {
								const newSet = new Set(prev);
								newSet.delete(index);
								return newSet;
							});
							setPostFeedbackProcessing((prev) => {
								const newMap = new Map(prev);
								newMap.delete(index);
								return newMap;
							});
						}
					} else if (subnet.status === "waiting_response") {
						if (subnet.data) {
							const result = parseAgentResponse(subnet.data);
							const contentHash = createContentHash(result);
							setPreFeedbackContent((prev) =>
								new Map(prev).set(index, contentHash)
							);
						}

						if (isShowingQuestion) {
							console.log(
								`Removing old content for subnet ${index} before showing new data and question`
							);
							updatedMessages = updatedMessages.filter((msg) => {
								if (
									msg.type === "workflow_subnet" &&
									msg.subnetIndex === index
								)
									return false;
								if (
									(msg.type === "question" ||
										msg.type === "notification") &&
									msg.questionData?.itemID === subnet.itemID
								)
									return false;
								return true;
							});
						}

						if (subnet.data) {
							const result = parseAgentResponse(subnet.data);
							let dataContent = result.content;

							try {
								const parsedData = JSON.parse(subnet.data);
								if (
									parsedData.enhancedPrompt &&
									parsedData.originalPrompt
								) {
									dataContent = "Prompt enhancement detected";
								} else if (result.content) {
									dataContent = result.content;
								}
							} catch {
								dataContent =
									result.content || "Processing data...";
							}

							const dataMessage: ChatMsg = {
								id: `subnet_${index}_data_${Date.now()}`,
								type: "workflow_subnet",
								content: dataContent || "Processing data...",
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

							if (isShowingQuestion) {
								updatedMessages.push(dataMessage);
							} else {
								const existingDataIndex =
									updatedMessages.findIndex(
										(msg) =>
											msg.type === "workflow_subnet" &&
											msg.subnetIndex === index &&
											msg.sourceId?.includes("_data") &&
											!msg.isRegenerated
									);

								if (existingDataIndex >= 0) {
									updatedMessages[existingDataIndex] =
										dataMessage;
								} else if (existingMessageIndex >= 0) {
									updatedMessages[existingMessageIndex] =
										dataMessage;
								} else {
									updatedMessages.push(dataMessage);
								}
							}
						} else {
							const waitingMessage: ChatMsg = {
								id: `subnet_${index}_${Date.now()}`,
								type: "workflow_subnet",
								content: "Waiting for response...",
								timestamp: new Date(),
								subnetStatus: "waiting_response",
								toolName: subnet.toolName,
								subnetIndex: index,
								sourceId: sourceId,
							};

							if (isShowingQuestion) {
								updatedMessages.push(waitingMessage);
							} else if (existingMessageIndex >= 0) {
								updatedMessages[existingMessageIndex] =
									waitingMessage;
							} else {
								updatedMessages.push(waitingMessage);
							}
						}

						// Handle questions
						if (subnet.question) {
							const questionText = subnet.question.text;
							const questionType = subnet.question.type;
							const questionId = `${questionType}_${
								subnet.itemID
							}_${Date.now()}`;

							const existingQuestionIndex = isShowingQuestion
								? -1
								: updatedMessages.findIndex(
										(msg) =>
											(msg.type === "question" ||
												msg.type === "notification") &&
											msg.questionData?.text ===
												questionText &&
											msg.questionData?.itemID ===
												subnet.question.itemID
								  );

							if (existingQuestionIndex === -1) {
								if (questionType === "notification") {
									const notificationMessage: ChatMsg = {
										id: `notification_${Date.now()}`,
										type: "notification",
										content: questionText,
										timestamp: new Date(),
										toolName: subnet.toolName,
										questionData: subnet.question,
										sourceId: questionId,
									};
									updatedMessages.push(notificationMessage);
									setPendingNotifications((prev) => [
										...prev,
										notificationMessage,
									]);
								} else {
									const questionMessage: ChatMsg = {
										id: `question_${Date.now()}`,
										type: "question",
										content: questionText,
										timestamp: new Date(),
										toolName: subnet.toolName,
										questionData: subnet.question,
										sourceId: questionId,
										question: questionText,
										answer: "Waiting for user response",
									};
									updatedMessages.push(questionMessage);
								}
								lastQuestionRef.current = questionId;
							}
						}
					} else if (subnet.status === "failed") {
						const failedMessage: ChatMsg = {
							id: `subnet_${index}_${Date.now()}`,
							type: "workflow_subnet",
							content: "Failed to process",
							timestamp: new Date(),
							subnetStatus: "failed",
							toolName: subnet.toolName,
							subnetIndex: index,
							sourceId: sourceId,
						};

						if (existingMessageIndex >= 0) {
							updatedMessages[existingMessageIndex] =
								failedMessage;
						} else {
							updatedMessages.push(failedMessage);
						}
					}
				});

				return updatedMessages;
			});
		},
		[
			subnetPreviousStatus,
			postFeedbackProcessing,
			feedbackGivenForSubnet,
			preFeedbackContent,
		]
	);

	const clearMessages = useCallback(() => {
		setChatMessages([]);
		setPendingNotifications([]);
		setPreFeedbackContent(new Map());
		setFeedbackGivenForSubnet(new Set());
		setSubnetPreviousStatus(new Map());
		setPostFeedbackProcessing(new Map());
	}, []);

	const resetFeedbackState = useCallback(() => {
		setFeedbackGivenForSubnet(new Set());
		setPostFeedbackProcessing(new Map());
		setPreFeedbackContent(new Map());
	}, []);

	return {
		chatMessages,
		setChatMessages,
		pendingNotifications,
		setPendingNotifications,
		preFeedbackContent,
		setPreFeedbackContent,
		feedbackGivenForSubnet,
		setFeedbackGivenForSubnet,
		subnetPreviousStatus,
		setSubnetPreviousStatus,
		postFeedbackProcessing,
		setPostFeedbackProcessing,
		updateMessagesWithSubnetData,
		clearMessages,
		resetFeedbackState,
	};
};
