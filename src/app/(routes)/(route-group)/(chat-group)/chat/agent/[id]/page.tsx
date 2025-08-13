"use client";
import ChatInput from "@/components/common/chat-input";
import { ChatMessage } from "@/components/common/chat-message";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAgentById } from "@/controllers/agents";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";
import { useExecutionStatusStore } from "@/stores/execution-status-store";
import { apiKeyManager } from "@/utils/api-key-manager";
import { useWorkflowExecutor } from "@/hooks/use-workflow-executor";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import ChatSkeleton from "@/components/common/chat-skeleton";

type ChatMsg = {
	id: string;
	type:
		| "user"
		| "response"
		| "question"
		| "answer"
		| "workflow_subnet"
		| "pending"
		| "notification";
	content: string;
	timestamp: Date;
	subnetStatus?:
		| "pending"
		| "in_progress"
		| "done"
		| "failed"
		| "waiting_response";
	toolName?: string;
	subnetIndex?: number;
	imageData?: string;
	isImage?: boolean;
	contentType?: string;
	questionData?: {
		type: string;
		text: string;
		itemID: number;
		expiresAt: string;
	};
	sourceId?: string;
	isRegenerated?: boolean;
	contentHash?: string;
	question?: string;
	answer?: string;
};

export default function AgentChatPage() {
	const {
		mode,
		setMode,
		prompt,
		setPrompt,
		selectedAgent,
		setSelectedAgent,
	} = useGlobalStore();
	const params = useParams();
	const router = useRouter();
	const searchParams = useSearchParams();
	const agentId = params.id as string;
	const urlWorkflowId = searchParams.get("workflowId");
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isExecuting, setIsExecuting] = useState(false);
	const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
	const [currentWorkflowData, setCurrentWorkflowData] = useState<any>(null);
	const [workflowStatus, setWorkflowStatus] = useState<
		| "running"
		| "stopped"
		| "completed"
		| "failed"
		| "waiting_response"
		| "in_progress"
	>("running");
	const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
		null
	);

	const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
	const [isInFeedbackMode, setIsInFeedbackMode] = useState(false);
	const { skyBrowser, address } = useWallet();

	const { setPollingStatus, stopCurrentExecution, currentExecution } =
		useWorkflowExecutionStore();

	const [pendingNotifications, setPendingNotifications] = useState<ChatMsg[]>(
		[]
	);

	const { updateExecutionStatus } = useExecutionStatusStore();

	const { executeAgentWorkflow } = useWorkflowExecutor();

	const [preFeedbackContent, setPreFeedbackContent] = useState<
		Map<number, string>
	>(new Map());
	const [feedbackGivenForSubnet, setFeedbackGivenForSubnet] = useState<
		Set<number>
	>(new Set());
	const [subnetPreviousStatus, setSubnetPreviousStatus] = useState<
		Map<number, string>
	>(new Map());
	const [hasFeedbackBeenGiven, setHasFeedbackBeenGiven] = useState(false);
	const [postFeedbackProcessing, setPostFeedbackProcessing] = useState<
		Map<number, boolean>
	>(new Map());

	const lastLoadedAgentId = useRef<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const hasAutoSubmittedRef = useRef(false);
	const lastQuestionRef = useRef<string | null>(null);

	const startPollingExistingWorkflow = useCallback(
		async (workflowId: string) => {
			if (!skyBrowser || !address) {
				console.warn(
					"Cannot start polling: missing skyBrowser or address",
					{ skyBrowser: !!skyBrowser, address: !!address }
				);
				return;
			}

			try {
				setIsExecuting(true);
				setPollingStatus(true);
				setWorkflowStatus("in_progress");
				setCurrentWorkflowId(workflowId);

				workflowExecutor.setCurrentWorkflowId(workflowId);

				const onStatusUpdate = (data: any) => {
					console.log("📊 Status update received:", data);
					setCurrentWorkflowData(data);

					if (data?.requestId && !currentWorkflowId) {
						setCurrentWorkflowId(data.requestId);
						workflowExecutor.setCurrentWorkflowId(data.requestId);
					}

					if (data?.userPrompt && data.userPrompt.trim().length > 0) {
						setChatMessages((prevMessages) => {
							const hasUserMessage = prevMessages.some(
								(msg) => msg.type === "user"
							);
							if (!hasUserMessage) {
								const userMessage: ChatMsg = {
									id: `user_${Date.now()}`,
									type: "user",
									content: data.userPrompt,
									timestamp: new Date(),
								};
								return [userMessage, ...prevMessages];
							}
							return prevMessages;
						});
					}

					if (
						data &&
						Array.isArray(data.subnets) &&
						data.subnets.length > 0
					) {
						const statusTransitions: Map<
							number,
							{
								prev: string | undefined;
								current: string;
								isRegenerating: boolean;
								isShowingQuestion: boolean;
							}
						> = new Map();

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

							data.subnets.forEach(
								(subnet: any, index: number) => {
									const sourceId = `subnet_${index}_${subnet.status}`;
									const transition =
										statusTransitions.get(index);
									const isRegenerating =
										transition?.isRegenerating || false;
									const isShowingQuestion =
										transition?.isShowingQuestion || false;

									let existingMessageIndex =
										updatedMessages.findIndex(
											(msg) =>
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index &&
												!msg.isRegenerated
										);

									if (subnet.status === "pending") {
										if (existingMessageIndex >= 0) {
											updatedMessages.splice(
												existingMessageIndex,
												1
											);
										}
									} else if (
										subnet.status === "in_progress"
									) {
										updatedMessages =
											updatedMessages.filter((msg) => {
												if (
													msg.type === "answer" &&
													msg.subnetIndex === index
												) {
													return false;
												}
												if (
													(msg.type === "question" ||
														msg.type ===
															"notification") &&
													msg.questionData?.itemID ===
														subnet.itemID
												) {
													return false;
												}
												if (
													msg.answer &&
													msg.subnetIndex === index
												) {
													return false;
												}
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
											updatedMessages =
												updatedMessages.filter(
													(msg) => {
														if (
															msg.type ===
																"workflow_subnet" &&
															msg.subnetIndex ===
																index &&
															!msg.isRegenerated
														) {
															return false;
														}
														if (
															(msg.type ===
																"question" ||
																msg.type ===
																	"notification") &&
															msg.questionData
																?.itemID ===
																subnet.itemID
														) {
															return false;
														}
														if (
															msg.type ===
																"answer" &&
															msg.subnetIndex ===
																index
														) {
															return false;
														}
														return true;
													}
												);

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

											updatedMessages.push(
												processingMessage
											);
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
												updatedMessages[
													existingMessageIndex
												] = progressMessage;
											} else {
												updatedMessages.push(
													progressMessage
												);
											}
										}
									} else if (
										subnet.status === "done" &&
										subnet.data
									) {
										const result = parseAgentResponse(
											subnet.data
										);
										const currentHash =
											createContentHash(result);

										const previousHash =
											preFeedbackContent.get(index);
										const hadFeedback =
											feedbackGivenForSubnet.has(index);
										const wasProcessingAfterFeedback =
											postFeedbackProcessing.get(index) ||
											false;

										const isContentChanged =
											hadFeedback &&
											previousHash &&
											previousHash !== currentHash;

										if (
											hadFeedback &&
											wasProcessingAfterFeedback
										) {
											const processingIndex =
												updatedMessages.findIndex(
													(msg) =>
														msg.type ===
															"workflow_subnet" &&
														msg.subnetIndex ===
															index &&
														msg.subnetStatus ===
															"in_progress" &&
														msg.isRegenerated
												);

											if (processingIndex >= 0) {
												const regeneratedMessage: ChatMsg =
													{
														id: `subnet_${index}_regenerated_${Date.now()}`,
														type: "workflow_subnet",
														content:
															result.content ||
															"Processing completed",
														timestamp: new Date(),
														subnetStatus: "done",
														toolName:
															subnet.toolName,
														subnetIndex: index,
														imageData:
															result.imageData,
														isImage: result.isImage,
														contentType:
															result.contentType,
														sourceId: `${sourceId}_regenerated`,
														isRegenerated: true,
														contentHash:
															currentHash,
													};

												updatedMessages[
													processingIndex
												] = regeneratedMessage;
											} else {
												const regeneratedMessage: ChatMsg =
													{
														id: `subnet_${index}_regenerated_${Date.now()}`,
														type: "workflow_subnet",
														content:
															result.content ||
															"Processing completed",
														timestamp: new Date(),
														subnetStatus: "done",
														toolName:
															subnet.toolName,
														subnetIndex: index,
														imageData:
															result.imageData,
														isImage: result.isImage,
														contentType:
															result.contentType,
														sourceId: `${sourceId}_regenerated`,
														isRegenerated: true,
														contentHash:
															currentHash,
													};

												updatedMessages.push(
													regeneratedMessage
												);
											}

											setFeedbackGivenForSubnet(
												(prev) => {
													const newSet = new Set(
														prev
													);
													newSet.delete(index);
													return newSet;
												}
											);
											setPostFeedbackProcessing(
												(prev) => {
													const newMap = new Map(
														prev
													);
													newMap.delete(index);
													return newMap;
												}
											);
										} else if (!hadFeedback) {
											const doneMessage: ChatMsg = {
												id: `subnet_${index}_${Date.now()}`,
												type: "workflow_subnet",
												content:
													result.content ||
													"Processing completed",
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
												updatedMessages[
													existingMessageIndex
												] = doneMessage;
											} else {
												updatedMessages.push(
													doneMessage
												);
											}
										} else {
											setFeedbackGivenForSubnet(
												(prev) => {
													const newSet = new Set(
														prev
													);
													newSet.delete(index);
													return newSet;
												}
											);
											setPostFeedbackProcessing(
												(prev) => {
													const newMap = new Map(
														prev
													);
													newMap.delete(index);
													return newMap;
												}
											);
										}
									} else if (
										subnet.status === "waiting_response"
									) {
										if (subnet.data) {
											const result = parseAgentResponse(
												subnet.data
											);
											const contentHash =
												createContentHash(result);
											setPreFeedbackContent((prev) =>
												new Map(prev).set(
													index,
													contentHash
												)
											);
										}

										if (isShowingQuestion) {
											console.log(
												`Removing old content for subnet ${index} before showing new data and question`
											);
											updatedMessages =
												updatedMessages.filter(
													(msg) => {
														if (
															msg.type ===
																"workflow_subnet" &&
															msg.subnetIndex ===
																index
														) {
															return false;
														}
														if (
															(msg.type ===
																"question" ||
																msg.type ===
																	"notification") &&
															msg.questionData
																?.itemID ===
																subnet.itemID
														) {
															return false;
														}
														return true;
													}
												);
										}

										if (subnet.data) {
											const result = parseAgentResponse(
												subnet.data
											);

											let dataContent = result.content;

											try {
												const parsedData = JSON.parse(
													subnet.data
												);
												if (
													parsedData.enhancedPrompt &&
													parsedData.originalPrompt
												) {
													dataContent =
														"Prompt enhancement detected";
												} else if (result.content) {
													dataContent =
														result.content;
												}
											} catch {
												dataContent =
													result.content ||
													"Processing data...";
											}

											const dataMessage: ChatMsg = {
												id: `subnet_${index}_data_${Date.now()}`,
												type: "workflow_subnet",
												content:
													dataContent ||
													"Processing data...",
												timestamp: new Date(),
												subnetStatus: "done",
												toolName: subnet.toolName,
												subnetIndex: index,
												imageData: result.imageData,
												isImage: result.isImage,
												contentType: result.contentType,
												sourceId: `${sourceId}_data`,
												contentHash:
													createContentHash(result),
											};

											if (isShowingQuestion) {
												updatedMessages.push(
													dataMessage
												);
											} else {
												const existingDataIndex =
													updatedMessages.findIndex(
														(msg) =>
															msg.type ===
																"workflow_subnet" &&
															msg.subnetIndex ===
																index &&
															msg.sourceId?.includes(
																"_data"
															) &&
															!msg.isRegenerated
													);

												if (existingDataIndex >= 0) {
													updatedMessages[
														existingDataIndex
													] = dataMessage;
												} else if (
													existingMessageIndex >= 0
												) {
													updatedMessages[
														existingMessageIndex
													] = dataMessage;
												} else {
													updatedMessages.push(
														dataMessage
													);
												}
											}
										} else {
											const waitingMessage: ChatMsg = {
												id: `subnet_${index}_${Date.now()}`,
												type: "workflow_subnet",
												content:
													"Waiting for response...",
												timestamp: new Date(),
												subnetStatus:
													"waiting_response",
												toolName: subnet.toolName,
												subnetIndex: index,
												sourceId: sourceId,
											};

											if (isShowingQuestion) {
												updatedMessages.push(
													waitingMessage
												);
											} else if (
												existingMessageIndex >= 0
											) {
												updatedMessages[
													existingMessageIndex
												] = waitingMessage;
											} else {
												updatedMessages.push(
													waitingMessage
												);
											}
										}

										if (subnet.question) {
											const questionText =
												subnet.question.text;
											const questionType =
												subnet.question.type;

											const questionId = `${questionType}_${
												subnet.itemID
											}_${Date.now()}`;

											const existingQuestionIndex =
												isShowingQuestion
													? -1
													: updatedMessages.findIndex(
															(msg) =>
																(msg.type ===
																	"question" ||
																	msg.type ===
																		"notification") &&
																msg.questionData
																	?.text ===
																	questionText &&
																msg.questionData
																	?.itemID ===
																	subnet
																		.question
																		.itemID
													  );

											if (existingQuestionIndex === -1) {
												if (
													questionType ===
													"notification"
												) {
													const notificationMessage: ChatMsg =
														{
															id: `notification_${Date.now()}`,
															type: "notification",
															content:
																questionText,
															timestamp:
																new Date(),
															toolName:
																subnet.toolName,
															questionData:
																subnet.question,
															sourceId:
																questionId,
														};
													updatedMessages.push(
														notificationMessage
													);

													setPendingNotifications(
														(prev) => [
															...prev,
															notificationMessage,
														]
													);
												} else {
													const questionMessage: ChatMsg =
														{
															id: `question_${Date.now()}`,
															type: "question",
															content:
																questionText,
															timestamp:
																new Date(),
															toolName:
																subnet.toolName,
															questionData:
																subnet.question,
															sourceId:
																questionId,
															question:
																questionText,
															answer: "Waiting for user response",
														};
													updatedMessages.push(
														questionMessage
													);
												}
												lastQuestionRef.current =
													questionId;
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
											updatedMessages[
												existingMessageIndex
											] = failedMessage;
										} else {
											updatedMessages.push(failedMessage);
										}
									}
								}
							);

							return updatedMessages;
						});

						if (data.workflowStatus === "completed") {
							setIsExecuting(false);
							setPollingStatus(false);
							setWorkflowStatus("completed");
							setIsInFeedbackMode(false);
							setFeedbackGivenForSubnet(new Set());
							setPostFeedbackProcessing(new Map() as any);

							// Add completion message for completed workflows
							setChatMessages((prev) => {
								// Check if completion message already exists
								const hasCompletionMessage = prev.some(
									(msg) =>
										msg.type === "response" &&
										msg.content ===
											"Workflow executed successfully"
								);

								if (!hasCompletionMessage) {
									const completionMessage: ChatMsg = {
										id: `completion_${Date.now()}`,
										type: "response",
										content:
											"Workflow executed successfully",
										timestamp: new Date(),
									};
									return [...prev, completionMessage];
								}
								return prev;
							});
						} else if (data.workflowStatus === "failed") {
							setIsExecuting(false);
							setPollingStatus(false);
							setWorkflowStatus("failed");
							setIsInFeedbackMode(false);
							setFeedbackGivenForSubnet(new Set());
							setPostFeedbackProcessing(new Map() as any);

							const errorMessage: ChatMsg = {
								id: `error_${Date.now()}`,
								type: "response",
								content: "Workflow execution failed",
								timestamp: new Date(),
							};
							setChatMessages((prev) => [...prev, errorMessage]);
						} else if (data.workflowStatus === "stopped") {
							setIsExecuting(false);
							setPollingStatus(false);
							setWorkflowStatus("stopped");
							setIsInFeedbackMode(false);
							setFeedbackGivenForSubnet(new Set());
							setPostFeedbackProcessing(new Map() as any);

							if (data.requestId && !currentWorkflowId) {
								setCurrentWorkflowId(data.requestId);
							}

							workflowExecutor.handleExternalStatusChange(
								"stopped"
							);
							stopCurrentExecution();
						} else if (data.workflowStatus === "in_progress") {
							setIsExecuting(true);
							setPollingStatus(true);
							setWorkflowStatus("in_progress");
							setIsInFeedbackMode(false);
						} else if (data.workflowStatus === "waiting_response") {
							setIsExecuting(true);
							setPollingStatus(true);
							setWorkflowStatus("waiting_response");
							setIsInFeedbackMode(true);
						}
					}
				};

				const success =
					await workflowExecutor.startPollingExistingWorkflow(
						workflowId,
						skyBrowser,
						{ address },
						onStatusUpdate
					);

				if (!success) {
					throw new Error(
						"Failed to start polling for existing workflow"
					);
				}
			} catch (error) {
				console.error(
					"Error starting polling for existing workflow:",
					error
				);
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("failed");
				setError("Failed to load workflow");
			}
		},
		[skyBrowser, address, setPollingStatus, stopCurrentExecution]
	);

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	const createContentHash = (data: any): string => {
		if (!data) return "";
		const content = JSON.stringify({
			content: data.content,
			imageData: data.imageData,
			contentType: data.contentType,
		});
		return content;
	};

	const parseAgentResponse = (
		subnetData: string
	): {
		content: string | null;
		imageData?: string;
		isImage?: boolean;
		contentType?: string;
	} => {
		try {
			const parsed = JSON.parse(subnetData);

			if (parsed?.contentType) {
				const contentType = parsed.contentType.toLowerCase();

				if (contentType.startsWith("image/")) {
					let imageData = "";

					if (
						parsed?.fileData &&
						typeof parsed.fileData === "string"
					) {
						imageData = parsed.fileData;
					} else if (
						parsed?.data &&
						typeof parsed.data === "string"
					) {
						imageData = parsed.data;
					}

					if (imageData) {
						return {
							content: `${contentType
								.split("/")[1]
								.toUpperCase()} image generated successfully`,
							imageData: imageData,
							isImage: true,
							contentType: contentType,
						};
					}
				} else if (
					contentType.startsWith("application/") ||
					contentType.startsWith("text/")
				) {
					let fileData = "";

					if (
						parsed?.fileData &&
						typeof parsed.fileData === "string"
					) {
						fileData = parsed.fileData;
					} else if (
						parsed?.data &&
						typeof parsed.data === "string"
					) {
						fileData = parsed.data;
					}

					if (fileData) {
						return {
							content: `${contentType} file generated successfully`,
							imageData: fileData,
							isImage: false,
							contentType: contentType,
						};
					}
				}
			}

			if (
				parsed?.data &&
				typeof parsed.data === "string" &&
				parsed.data.startsWith("/9j/")
			) {
				return {
					content: "JPEG image generated successfully",
					imageData: parsed.data,
					isImage: true,
					contentType: "image/jpeg",
				};
			}

			if (parsed?.fileData && typeof parsed.fileData === "string") {
				if (parsed.fileData.startsWith("/9j/")) {
					return {
						content: "JPEG image generated successfully",
						imageData: parsed.fileData,
						isImage: true,
						contentType: "image/jpeg",
					};
				} else if (parsed.fileData.startsWith("data:image/")) {
					const mimeType =
						parsed.fileData.match(/data:(.*?);/)?.[1] ||
						"image/jpeg";
					return {
						content: `${mimeType
							.split("/")[1]
							.toUpperCase()} image generated successfully`,
						imageData: parsed.fileData,
						isImage: true,
						contentType: mimeType,
					};
				}
			}

			if (parsed?.data?.data?.choices?.[0]?.message?.content) {
				return { content: parsed.data.data.choices[0].message.content };
			}
			if (parsed?.data?.choices?.[0]?.message?.content) {
				return { content: parsed.data.choices[0].message.content };
			}
			if (parsed?.data?.message) {
				return { content: parsed.data.message };
			}
			if (parsed?.message) {
				return { content: parsed.message };
			}
			return { content: null };
		} catch {
			return { content: null };
		}
	};

	const handlePromptSubmit = async (
		message: string,
		selectedAgentId?: string
	) => {
		if (!message.trim() || !selectedAgent || !skyBrowser || !address)
			return;

		if (
			isInFeedbackMode ||
			currentWorkflowData?.workflowStatus === "waiting_response"
		) {
			await handleFeedbackResponse(message);
			return;
		}

		if (isExecuting) {
			return;
		}

		try {
			setIsExecuting(true);
			setPollingStatus(true);
			setWorkflowStatus("running");
			setIsInFeedbackMode(false);
			setFeedbackGivenForSubnet(new Set());
			setPostFeedbackProcessing(new Map());
			setPreFeedbackContent(new Map());

			setChatMessages([]);
			setCurrentWorkflowData(null);
			lastQuestionRef.current = null;

			const userMessage: ChatMsg = {
				id: `user_${Date.now()}`,
				type: "user",
				content: message,
				timestamp: new Date(),
			};

			setChatMessages([userMessage]);

			const onStatusUpdate = (data: any) => {
				setCurrentWorkflowData(data);

				if (data?.requestId && !currentWorkflowId) {
					setCurrentWorkflowId(data.requestId);
					workflowExecutor.setCurrentWorkflowId(data.requestId);
				}

				if (
					data &&
					Array.isArray(data.subnets) &&
					data.subnets.length > 0
				) {
					const statusTransitions: Map<
						number,
						{
							prev: string | undefined;
							current: string;
							isRegenerating: boolean;
							isShowingQuestion: boolean;
						}
					> = new Map();

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
							const isRegenerating =
								transition?.isRegenerating || false;
							const isShowingQuestion =
								transition?.isShowingQuestion || false;

							let existingMessageIndex =
								updatedMessages.findIndex(
									(msg) =>
										msg.type === "workflow_subnet" &&
										msg.subnetIndex === index &&
										!msg.isRegenerated
								);

							if (subnet.status === "pending") {
								if (existingMessageIndex >= 0) {
									updatedMessages.splice(
										existingMessageIndex,
										1
									);
								}
							} else if (subnet.status === "in_progress") {
								updatedMessages = updatedMessages.filter(
									(msg) => {
										if (
											msg.type === "answer" &&
											msg.subnetIndex === index
										) {
											return false;
										}
										if (
											(msg.type === "question" ||
												msg.type === "notification") &&
											msg.questionData?.itemID ===
												subnet.itemID
										) {
											return false;
										}
										if (
											msg.answer &&
											msg.subnetIndex === index
										) {
											return false;
										}
										if (
											msg.content?.includes(
												"Feedback submitted successfully"
											) ||
											msg.content?.includes("feedback") ||
											msg.content?.includes(
												"submitted successfully"
											) ||
											msg.content?.includes(
												"How do you like the result"
											) ||
											msg.content?.includes(
												"pixelated"
											) ||
											msg.content?.includes(
												"Yes, proceed"
											) ||
											msg.content?.includes(
												"Provide feedback"
											)
										) {
											return false;
										}
										return true;
									}
								);

								const isProcessingAfterFeedback =
									isRegenerating ||
									postFeedbackProcessing.get(index) ||
									false;

								if (isProcessingAfterFeedback) {
									console.log(
										`Showing processing after feedback for subnet ${index}`
									);
									updatedMessages = updatedMessages.filter(
										(msg) => {
											if (
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index &&
												!msg.isRegenerated
											) {
												return false;
											}
											if (
												(msg.type === "question" ||
													msg.type ===
														"notification") &&
												msg.questionData?.itemID ===
													subnet.itemID
											) {
												return false;
											}
											if (
												msg.type === "answer" &&
												msg.subnetIndex === index
											) {
												return false;
											}
											return true;
										}
									);

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
							} else if (
								subnet.status === "done" &&
								subnet.data
							) {
								const result = parseAgentResponse(subnet.data);
								const currentHash = createContentHash(result);

								const previousHash =
									preFeedbackContent.get(index);
								const hadFeedback =
									feedbackGivenForSubnet.has(index);
								const wasProcessingAfterFeedback =
									postFeedbackProcessing.get(index) || false;

								const isContentChanged =
									hadFeedback &&
									previousHash &&
									previousHash !== currentHash;

								if (hadFeedback && wasProcessingAfterFeedback) {
									const processingIndex =
										updatedMessages.findIndex(
											(msg) =>
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index &&
												msg.subnetStatus ===
													"in_progress" &&
												msg.isRegenerated
										);

									if (processingIndex >= 0) {
										const regeneratedMessage: ChatMsg = {
											id: `subnet_${index}_regenerated_${Date.now()}`,
											type: "workflow_subnet",
											content:
												result.content ||
												"Processing completed",
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

										updatedMessages[processingIndex] =
											regeneratedMessage;
									} else {
										const regeneratedMessage: ChatMsg = {
											id: `subnet_${index}_regenerated_${Date.now()}`,
											type: "workflow_subnet",
											content:
												result.content ||
												"Processing completed",
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

										updatedMessages.push(
											regeneratedMessage
										);
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
											result.content ||
											"Processing completed",
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
									const result = parseAgentResponse(
										subnet.data
									);
									const contentHash =
										createContentHash(result);
									setPreFeedbackContent((prev) =>
										new Map(prev).set(index, contentHash)
									);
								}

								if (isShowingQuestion) {
									console.log(
										`Removing old content for subnet ${index} before showing new data and question`
									);
									updatedMessages = updatedMessages.filter(
										(msg) => {
											if (
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index
											) {
												return false;
											}
											if (
												(msg.type === "question" ||
													msg.type ===
														"notification") &&
												msg.questionData?.itemID ===
													subnet.itemID
											) {
												return false;
											}
											return true;
										}
									);
								}

								if (subnet.data) {
									const result = parseAgentResponse(
										subnet.data
									);

									let dataContent = result.content;

									try {
										const parsedData = JSON.parse(
											subnet.data
										);
										if (
											parsedData.enhancedPrompt &&
											parsedData.originalPrompt
										) {
											dataContent =
												"Prompt enhancement detected";
										} else if (result.content) {
											dataContent = result.content;
										}
									} catch {
										dataContent =
											result.content ||
											"Processing data...";
									}

									const dataMessage: ChatMsg = {
										id: `subnet_${index}_data_${Date.now()}`,
										type: "workflow_subnet",
										content:
											dataContent || "Processing data...",
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
													msg.type ===
														"workflow_subnet" &&
													msg.subnetIndex === index &&
													msg.sourceId?.includes(
														"_data"
													) &&
													!msg.isRegenerated
											);

										if (existingDataIndex >= 0) {
											updatedMessages[existingDataIndex] =
												dataMessage;
										} else if (existingMessageIndex >= 0) {
											updatedMessages[
												existingMessageIndex
											] = dataMessage;
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

								if (subnet.question) {
									const questionText = subnet.question.text;
									const questionType = subnet.question.type;

									const questionId = `${questionType}_${
										subnet.itemID
									}_${Date.now()}`;

									const existingQuestionIndex =
										isShowingQuestion
											? -1
											: updatedMessages.findIndex(
													(msg) =>
														(msg.type ===
															"question" ||
															msg.type ===
																"notification") &&
														msg.questionData
															?.text ===
															questionText &&
														msg.questionData
															?.itemID ===
															subnet.question
																.itemID
											  );

									if (existingQuestionIndex === -1) {
										if (questionType === "notification") {
											const notificationMessage: ChatMsg =
												{
													id: `notification_${Date.now()}`,
													type: "notification",
													content: questionText,
													timestamp: new Date(),
													toolName: subnet.toolName,
													questionData:
														subnet.question,
													sourceId: questionId,
												};
											updatedMessages.push(
												notificationMessage
											);

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
											updatedMessages.push(
												questionMessage
											);
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

					if (data.workflowStatus === "completed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("completed");
						setIsInFeedbackMode(false);
						setFeedbackGivenForSubnet(new Set());
						setPostFeedbackProcessing(new Map() as any);
						setPrompt("");

						// Add completion message for completed workflows
						setChatMessages((prev) => {
							// Check if completion message already exists
							const hasCompletionMessage = prev.some(
								(msg) =>
									msg.type === "response" &&
									msg.content ===
										"Workflow executed successfully"
							);

							if (!hasCompletionMessage) {
								const completionMessage: ChatMsg = {
									id: `completion_${Date.now()}`,
									type: "response",
									content: "Workflow executed successfully",
									timestamp: new Date(),
								};
								return [...prev, completionMessage];
							}
							return prev;
						});
					} else if (data.workflowStatus === "failed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("failed");
						setIsInFeedbackMode(false);
						setFeedbackGivenForSubnet(new Set());
						setPostFeedbackProcessing(new Map() as any);

						const errorMessage: ChatMsg = {
							id: `error_${Date.now()}`,
							type: "response",
							content: "Workflow execution failed",
							timestamp: new Date(),
						};
						setChatMessages((prev) => [...prev, errorMessage]);
					} else if (data.workflowStatus === "stopped") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("stopped");
						setIsInFeedbackMode(false);
						setFeedbackGivenForSubnet(new Set());
						setPostFeedbackProcessing(new Map() as any);

						if (data.requestId && !currentWorkflowId) {
							setCurrentWorkflowId(data.requestId);
						}

						workflowExecutor.handleExternalStatusChange("stopped");
						stopCurrentExecution();
					} else if (data.workflowStatus === "in_progress") {
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("in_progress");
						setIsInFeedbackMode(false);
					} else if (data.workflowStatus === "waiting_response") {
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("waiting_response");
						setIsInFeedbackMode(true);
					}
				}
			};

			const workflowId = await executeAgentWorkflow(
				selectedAgent as any,
				message,
				address,
				skyBrowser,
				{ address },
				onStatusUpdate
			);

			setCurrentWorkflowId(workflowId);
			workflowExecutor.setCurrentWorkflowId(workflowId);

			const currentUrl = new URL(window.location.href);
			currentUrl.searchParams.set("workflowId", workflowId);
			window.history.replaceState({}, "", currentUrl.toString());

			setPrompt("");
		} catch (error) {
			console.error("Error executing workflow:", error);
			setIsExecuting(false);
			setPollingStatus(false);
			setWorkflowStatus("failed");
		}
	};

	const handleFeedbackSubmit = async (
		question: string,
		answer: string,
		feedback: string
	) => {
		if (!currentWorkflowId || !skyBrowser || !address) {
			console.error("Missing required data for feedback submission");
			return;
		}

		try {
			setIsSubmittingFeedback(true);

			const waitingSubnetIndex = currentWorkflowData?.subnets?.findIndex(
				(subnet: any) =>
					subnet.status === "waiting_response" && subnet.question
			);

			if (waitingSubnetIndex !== undefined && waitingSubnetIndex >= 0) {
				setFeedbackGivenForSubnet((prev) =>
					new Set(prev).add(waitingSubnetIndex)
				);
				setPostFeedbackProcessing((prev) =>
					new Map(prev).set(waitingSubnetIndex, true)
				);
			}

			const feedbackMessage: ChatMsg = {
				id: `feedback_${Date.now()}`,
				type: "answer",
				content: feedback,
				timestamp: new Date(),
			};

			setChatMessages((prev) => [...prev, feedbackMessage]);

			const nftUserAgentUrl = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL;
			if (!nftUserAgentUrl) {
				console.error(
					"❌ NEXT_PUBLIC_NFT_USER_AGENT_URL environment variable is not configured"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Feedback submission endpoint not configured",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const apiKey = await apiKeyManager.getApiKey(skyBrowser, {
				address,
			});
			if (!apiKey) {
				console.error(
					"❌ Failed to get API key for feedback submission"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Failed to authenticate feedback submission",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const contextPayload = {
				workflowId: currentWorkflowId,
				answer: feedback,
				question: question,
			};

			const submittingMessage: ChatMsg = {
				id: `submitting_${Date.now()}`,
				type: "response",
				content: "Submitting feedback...",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, submittingMessage]);

			const response = await fetch(`${nftUserAgentUrl}/natural-request`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
				},
				body: JSON.stringify(contextPayload),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to submit feedback: ${response.status} ${response.statusText}`
				);
			}

			const result = await response.json();

			setChatMessages((prev) =>
				prev.filter((msg) => msg.id !== submittingMessage.id)
			);

			const successMessage: ChatMsg = {
				id: `success_${Date.now()}`,
				type: "response",
				content: "Feedback submitted successfully",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, successMessage]);

			setPrompt("");
			setWorkflowStatus("running");
			setIsExecuting(true);
			setIsInFeedbackMode(false);

			if (currentWorkflowData) {
				setCurrentWorkflowData({
					...currentWorkflowData,
					workflowStatus: "running",
				});
			}

			if (workflowExecutor.getCurrentWorkflowId() === currentWorkflowId) {
				console.log(
					"✅ Workflow executor is still active and polling for workflow:",
					currentWorkflowId
				);
			} else {
				console.warn(
					"⚠️ Workflow executor is not polling for the current workflow. This might indicate an issue."
				);
			}
		} catch (error) {
			console.error("Error submitting feedback:", error);

			setChatMessages((prev) =>
				prev.filter((msg) => msg.content !== "Submitting feedback...")
			);

			const errorMessage: ChatMsg = {
				id: `error_${Date.now()}`,
				type: "response",
				content: `Error submitting feedback: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSubmittingFeedback(false);
		}
	};

	const handleFeedbackProceed = async (question: string, answer: string) => {
		if (!currentWorkflowId || !skyBrowser || !address) {
			console.error("Missing required data for feedback proceed");
			return;
		}

		try {
			setIsSubmittingFeedback(true);

			const waitingSubnetIndex = currentWorkflowData?.subnets?.findIndex(
				(subnet: any) =>
					subnet.status === "waiting_response" && subnet.question
			);

			if (waitingSubnetIndex !== undefined && waitingSubnetIndex >= 0) {
				setFeedbackGivenForSubnet((prev) =>
					new Set(prev).add(waitingSubnetIndex)
				);
				setPostFeedbackProcessing((prev) =>
					new Map(prev).set(waitingSubnetIndex, true)
				);
			}

			const proceedMessage: ChatMsg = {
				id: `proceed_${Date.now()}`,
				type: "answer",
				content: "Proceeding with current result",
				timestamp: new Date(),
			};

			setChatMessages((prev) => [...prev, proceedMessage]);

			const nftUserAgentUrl = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL;
			if (!nftUserAgentUrl) {
				console.error(
					"❌ NEXT_PUBLIC_NFT_USER_AGENT_URL environment variable is not configured"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Feedback submission endpoint not configured",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const apiKey = await apiKeyManager.getApiKey(skyBrowser, {
				address,
			});
			if (!apiKey) {
				console.error(
					"❌ Failed to get API key for feedback submission"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Failed to authenticate feedback submission",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const contextPayload = {
				workflowId: currentWorkflowId,
				answer: "Proceed with current result",
				question: question,
			};

			const submittingMessage: ChatMsg = {
				id: `submitting_${Date.now()}`,
				type: "response",
				content: "Processing feedback...",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, submittingMessage]);

			const response = await fetch(`${nftUserAgentUrl}/natural-request`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
				},
				body: JSON.stringify(contextPayload),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to submit feedback: ${response.status} ${response.statusText}`
				);
			}

			const result = await response.json();

			setChatMessages((prev) =>
				prev.filter((msg) => msg.id !== submittingMessage.id)
			);

			const successMessage: ChatMsg = {
				id: `success_${Date.now()}`,
				type: "response",
				content: "Feedback processed successfully",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, successMessage]);

			setPrompt("");
			setWorkflowStatus("running");
			setIsExecuting(true);
			setIsInFeedbackMode(false);

			if (currentWorkflowData) {
				setCurrentWorkflowData({
					...currentWorkflowData,
					workflowStatus: "running",
				});
			}

			if (workflowExecutor.getCurrentWorkflowId() === currentWorkflowId) {
				console.log(
					"✅ Workflow executor is still active and polling for workflow:",
					currentWorkflowId
				);
			} else {
				console.warn(
					"⚠️ Workflow executor is not polling for the current workflow. This might indicate an issue."
				);
			}
		} catch (error) {
			console.error("Error processing feedback:", error);

			setChatMessages((prev) =>
				prev.filter((msg) => msg.content !== "Processing feedback...")
			);

			const errorMessage: ChatMsg = {
				id: `error_${Date.now()}`,
				type: "response",
				content: `Error processing feedback: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSubmittingFeedback(false);
		}
	};

	const handleFeedbackResponse = async (feedback: string) => {
		if (!currentWorkflowId || !skyBrowser || !address) {
			console.error("Missing required data for feedback submission");
			return;
		}

		try {
			setIsSubmittingFeedback(true);

			const waitingSubnetIndex = currentWorkflowData?.subnets?.findIndex(
				(subnet: any) =>
					subnet.status === "waiting_response" && subnet.question
			);

			if (waitingSubnetIndex !== undefined && waitingSubnetIndex >= 0) {
				setFeedbackGivenForSubnet((prev) =>
					new Set(prev).add(waitingSubnetIndex)
				);
				setPostFeedbackProcessing((prev) =>
					new Map(prev).set(waitingSubnetIndex, true)
				);
			}

			const feedbackMessage: ChatMsg = {
				id: `feedback_${Date.now()}`,
				type: "answer",
				content: feedback,
				timestamp: new Date(),
			};

			setChatMessages((prev) => [...prev, feedbackMessage]);

			const nftUserAgentUrl = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL;
			if (!nftUserAgentUrl) {
				console.error(
					"❌ NEXT_PUBLIC_NFT_USER_AGENT_URL environment variable is not configured"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Feedback submission endpoint not configured",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const apiKey = await apiKeyManager.getApiKey(skyBrowser, {
				address,
			});
			if (!apiKey) {
				console.error(
					"❌ Failed to get API key for feedback submission"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content:
						"Error: Failed to authenticate feedback submission",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const subnetWithQuestion = currentWorkflowData?.subnets?.find(
				(subnet: any) =>
					subnet.status === "waiting_response" && subnet.question
			);

			if (!subnetWithQuestion?.question?.text) {
				console.error(
					"❌ No question found in workflow data for feedback"
				);
				const errorMessage: ChatMsg = {
					id: `error_${Date.now()}`,
					type: "response",
					content: "Error: No question found to answer",
					timestamp: new Date(),
				};
				setChatMessages((prev) => [...prev, errorMessage]);
				return;
			}

			const contextPayload = {
				workflowId: currentWorkflowId,
				answer: feedback,
				question: subnetWithQuestion.question.text,
			};

			const submittingMessage: ChatMsg = {
				id: `submitting_${Date.now()}`,
				type: "response",
				content: "Submitting feedback...",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, submittingMessage]);

			const response = await fetch(`${nftUserAgentUrl}/natural-request`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-api-key": apiKey,
				},
				body: JSON.stringify(contextPayload),
			});

			if (!response.ok) {
				throw new Error(
					`Failed to submit feedback: ${response.status} ${response.statusText}`
				);
			}

			const result = await response.json();

			setChatMessages((prev) =>
				prev.filter((msg) => msg.id !== submittingMessage.id)
			);

			const successMessage: ChatMsg = {
				id: `success_${Date.now()}`,
				type: "response",
				content: "Feedback submitted successfully",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, successMessage]);

			setPrompt("");
			setWorkflowStatus("running");
			setIsExecuting(true);
			setIsInFeedbackMode(false);

			if (currentWorkflowData) {
				setCurrentWorkflowData({
					...currentWorkflowData,
					workflowStatus: "running",
				});
			}

			if (workflowExecutor.getCurrentWorkflowId() === currentWorkflowId) {
				console.log(
					"✅ Workflow executor is still active and polling for workflow:",
					currentWorkflowId
				);
			} else {
				console.warn(
					"⚠️ Workflow executor is not polling for the current workflow. This might indicate an issue."
				);
			}
		} catch (error) {
			console.error("Error submitting feedback:", error);

			setChatMessages((prev) =>
				prev.filter((msg) => msg.content !== "Submitting feedback...")
			);

			const errorMessage: ChatMsg = {
				id: `error_${Date.now()}`,
				type: "response",
				content: `Error submitting feedback: ${
					error instanceof Error ? error.message : "Unknown error"
				}`,
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, errorMessage]);
		} finally {
			setIsSubmittingFeedback(false);
		}
	};

	const handleStopExecution = async () => {
		if (!skyBrowser || !address || !currentWorkflowId) {
			console.warn("Cannot stop execution: missing required data");
			return;
		}

		try {
			const success = await workflowExecutor.emergencyStop(
				skyBrowser,
				{ address },
				"User requested emergency stop",
				currentWorkflowId
			);

			if (success) {
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("stopped");
				stopCurrentExecution();
			} else {
				console.error("❌ Failed to emergency stop workflow");
			}
		} catch (error) {
			console.error("Error during emergency stop:", error);
			setIsExecuting(false);
			setPollingStatus(false);
			setWorkflowStatus("stopped");
			stopCurrentExecution();
		}
	};

	const handleResumeExecution = async () => {
		if (!skyBrowser || !address || !currentWorkflowId) {
			console.warn("Cannot resume execution: missing required data");
			return;
		}

		try {
			const newStatusCallback = (data: any) => {
				setCurrentWorkflowData(data);

				if (data?.requestId && !currentWorkflowId) {
					setCurrentWorkflowId(data.requestId);
					workflowExecutor.setCurrentWorkflowId(data.requestId);
				}
			};

			workflowExecutor.setCurrentStatusCallback(newStatusCallback);

			const success = await workflowExecutor.resumeWorkflow(
				skyBrowser,
				{
					address,
				},
				currentWorkflowId
			);

			if (success) {
				setIsExecuting(true);
				setPollingStatus(true);
				setWorkflowStatus("running");
			} else {
				console.error("❌ Failed to resume workflow");
			}
		} catch (error) {
			console.error("Error during workflow resume:", error);
			setIsExecuting(true);
			setPollingStatus(true);
			setWorkflowStatus("running");
		}
	};

	const handleNotificationYes = async (notification: ChatMsg) => {
		setPendingNotifications((prev) =>
			prev.filter((n) => n.id !== notification.id)
		);
	};

	const handleNotificationNo = async (notification: ChatMsg) => {
		setPendingNotifications((prev) =>
			prev.filter((n) => n.id !== notification.id)
		);

		await handleStopExecution();
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatMessages]);

	useEffect(() => {
		return () => {
			if (
				currentWorkflowId &&
				workflowStatus !== "stopped" &&
				workflowStatus !== "waiting_response" &&
				workflowStatus !== "in_progress" &&
				workflowStatus !== "running"
			) {
				workflowExecutor.clearCurrentWorkflow();
			}
		};
	}, [currentWorkflowId, workflowStatus]);

	useEffect(() => {
		if (isLoading || !skyBrowser || !address) {
			return;
		}

		if (urlWorkflowId && urlWorkflowId.trim().length > 0) {
			if (currentWorkflowId !== urlWorkflowId) {
				if (currentWorkflowId) {
					workflowExecutor.clearCurrentWorkflow();
				}

				// Clear current state
				setChatMessages([]);
				setCurrentWorkflowData(null);
				setIsExecuting(false);
				setPollingStatus(false);
				setWorkflowStatus("running");
				setIsInFeedbackMode(false);
				setFeedbackGivenForSubnet(new Set());
				setPostFeedbackProcessing(new Map());
				setPreFeedbackContent(new Map());
				setPendingNotifications([]);

				startPollingExistingWorkflow(urlWorkflowId);
			}
		} else if (currentWorkflowId && !urlWorkflowId) {
			// If there's no workflow ID in URL but we have a current workflow, clear everything
			workflowExecutor.clearCurrentWorkflow();
			setChatMessages([]);
			setCurrentWorkflowData(null);
			setCurrentWorkflowId(null);
			setIsExecuting(false);
			setPollingStatus(false);
			setWorkflowStatus("running");
			setIsInFeedbackMode(false);
			setFeedbackGivenForSubnet(new Set());
			setPostFeedbackProcessing(new Map());
			setPreFeedbackContent(new Map());
			setPendingNotifications([]);
		}
	}, [isLoading, skyBrowser, address, urlWorkflowId, currentWorkflowId]);

	// Auto-submit prompt after navigation from create page once everything is ready
	useEffect(() => {
		if (isLoading) {
			return;
		}
		if (hasAutoSubmittedRef.current) {
			// If we already auto-submitted but the prompt is empty, reset the flag
			if (!prompt || prompt.trim().length === 0) {
				hasAutoSubmittedRef.current = false;
			} else {
				return;
			}
		}
		if (urlWorkflowId) {
			return;
		}
		if (isExecuting && currentWorkflowId) {
			return;
		}

		// Check if all conditions are met for auto-submit
		const canAutoSubmit =
			selectedAgent &&
			selectedAgent.id === agentId &&
			prompt &&
			prompt.trim().length > 0 &&
			skyBrowser &&
			address &&
			!isExecuting &&
			!isSubmittingFeedback &&
			chatMessages.length === 0;

		if (canAutoSubmit) {
			hasAutoSubmittedRef.current = true;
			// Small delay to ensure navigation is complete
			setTimeout(() => {
				handlePromptSubmit(prompt);
			}, 100);
		}
	}, [
		isLoading,
		selectedAgent?.id,
		agentId,
		prompt,
		skyBrowser,
		address,
		isExecuting,
		isSubmittingFeedback,
		chatMessages.length,
		urlWorkflowId,
		currentWorkflowId,
	]);

	useEffect(() => {
		let isMounted = true;
		const fetchAgent = async () => {
			if (
				!selectedAgent ||
				selectedAgent.id !== agentId ||
				lastLoadedAgentId.current !== agentId
			) {
				setIsLoading(true);
				try {
					const response = await getAgentById(agentId);
					const agent = response?.data;
					if (isMounted) {
						if (agent) {
							setSelectedAgent(agent);
							setError(null);
							lastLoadedAgentId.current = agentId;
						} else {
							setError("Agent not found");
						}
					}
				} catch (err) {
					console.error("Error fetching agent:", err);
					if (isMounted) setError("Failed to load agent");
				} finally {
					if (isMounted) setIsLoading(false);
				}
			} else {
				setIsLoading(false);
			}
		};

		fetchAgent();

		return () => {
			isMounted = false;
		};
	}, [agentId, selectedAgent, setSelectedAgent]);

	// Cleanup effect to reset execution status on unmount
	useEffect(() => {
		return () => {
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		};
	}, [updateExecutionStatus]);

	// Effect to update execution status when workflow starts
	useEffect(() => {
		if (isExecuting && !currentWorkflowId) {
			updateExecutionStatus({
				isRunning: true,
				responseId: undefined,
				currentSubnet: undefined,
			});
		}
	}, [isExecuting, currentWorkflowId, updateExecutionStatus]);

	// Effect to update execution status when workflow completes
	useEffect(() => {
		if (!isExecuting && currentWorkflowId) {
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		}
	}, [isExecuting, currentWorkflowId, updateExecutionStatus]);

	// Effect to update execution status when workflow ID changes
	useEffect(() => {
		if (currentWorkflowId) {
			updateExecutionStatus({ responseId: currentWorkflowId });
		}
	}, [currentWorkflowId, updateExecutionStatus]);

	// Effect to update execution status when workflow status changes
	useEffect(() => {
		if (
			workflowStatus === "completed" ||
			workflowStatus === "failed" ||
			workflowStatus === "stopped"
		) {
			updateExecutionStatus({
				isRunning: false,
				responseId: undefined,
				currentSubnet: undefined,
			});
		}
	}, [workflowStatus, updateExecutionStatus]);

	// Effect to update current subnet when workflow data changes
	useEffect(() => {
		if (
			currentWorkflowData?.subnets &&
			Array.isArray(currentWorkflowData.subnets)
		) {
			const inProgressSubnet = currentWorkflowData.subnets.find(
				(subnet: any) => subnet.status === "in_progress"
			);

			if (inProgressSubnet) {
				updateExecutionStatus({
					currentSubnet: inProgressSubnet.toolName,
				});
			}
		}
	}, [currentWorkflowData, updateExecutionStatus]);

	if (isLoading) {
		return (
			<div className="relative w-full max-w-7xl mx-auto h-full flex flex-col">
				<ChatSkeleton />;{/* Input Area Skeleton */}
				<div className="mt-8 space-y-2 absolute bottom-0 left-0 right-0  pt-2 bg-background w-full">
					<Skeleton className="h-6	 w-24" />
					<div className="flex space-x-2">
						<Skeleton className="h-10 flex-1 rounded-md" />
						<Skeleton className="h-10 w-10 rounded-md" />
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-red-500 mb-4">
						{error || "Agent not found"}
					</p>
					<Button onClick={() => router.push("/create")}>
						Go to Create Page
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="relative w-full h-full flex flex-col">
			<div className="flex-1 p-4 pb-24 min-h-0">
				{chatMessages.length === 0 ? (
					<ChatSkeleton />
				) : (
					<div className="overflow-y-auto scrollbar-hide h-[calc(100vh-10rem)]">
						{chatMessages.map((message, index) => (
							<ChatMessage
								key={message.id}
								message={message}
								isLast={index === chatMessages.length - 1}
								onNotificationYes={handleNotificationYes}
								onNotificationNo={handleNotificationNo}
								isPendingNotification={pendingNotifications.some(
									(n) => n.id === message.id
								)}
								onFeedbackSubmit={handleFeedbackSubmit}
								onFeedbackProceed={handleFeedbackProceed}
								showFeedbackButtons={
									message.type === "question" &&
									message.questionData?.type !==
										"authentication"
								}
							/>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			<div className="absolute bottom-4 left-0 right-0 px-4">
				<ChatInput
					onSend={handlePromptSubmit}
					onStop={handleStopExecution}
					onResume={handleResumeExecution}
					mode={mode}
					setMode={handleModeChange}
					prompt={prompt}
					setPrompt={setPrompt}
					hideModeSelection={true}
					disableAgentSelection={true}
					isExecuting={
						(workflowStatus === "stopped" ? false : isExecuting) ||
						isSubmittingFeedback ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus ===
							  "in_progress") ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus === "pending") ||
						(workflowStatus === "stopped"
							? false
							: currentExecution?.workflowStatus ===
							  "waiting_response")
					}
					workflowStatus={
						workflowStatus === "stopped"
							? "stopped"
							: currentWorkflowData?.workflowStatus ===
							  "waiting_response"
							? "waiting_response"
							: workflowStatus
					}
				/>
			</div>
		</div>
	);
}
