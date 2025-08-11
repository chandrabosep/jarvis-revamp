"use client";
import ChatInput from "@/components/common/chat-input";
import { ChatMessage } from "@/components/common/chat-message";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useGlobalStore } from "@/stores/global-store";
import { useParams, useRouter } from "next/navigation";
import { getAgentById } from "@/controllers/agents";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { AgentDetail } from "@/types";
import { workflowExecutor } from "@/utils/workflow-executor";
import { useWorkflowExecutionStore } from "@/stores/workflow-execution-store";
import { apiKeyManager } from "@/utils/api-key-manager";

type ChatMsg = {
	id: string;
	type:
		| "user"
		| "response"
		| "question"
		| "answer"
		| "workflow_subnet"
		| "pending";
	content: string;
	timestamp: Date;
	// Workflow subnet specific fields
	subnetStatus?:
		| "pending"
		| "in_progress"
		| "done"
		| "failed"
		| "waiting_response";
	toolName?: string;
	subnetIndex?: number;
	// File data fields
	imageData?: string;
	isImage?: boolean;
	contentType?: string;
	// Question specific fields for authentication
	questionData?: {
		type: string;
		text: string;
		itemID: number;
		expiresAt: string;
	};
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
	const agentId = params.id as string;
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

	const lastLoadedAgentId = useRef<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const hasAutoSubmittedRef = useRef(false);

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	// Helper: Parse agent response from workflow result
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

			// Check for contentType first - this is the most reliable indicator
			if (parsed?.contentType) {
				const contentType = parsed.contentType.toLowerCase();

				// Handle different content types
				if (contentType.startsWith("image/")) {
					// This is an image
					let imageData = "";

					// Check for fileData first
					if (
						parsed?.fileData &&
						typeof parsed.fileData === "string"
					) {
						imageData = parsed.fileData;
					} else if (
						parsed?.data &&
						typeof parsed.data === "string"
					) {
						// Fallback to data field
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
					// This is a file or document
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
							imageData: fileData, // We'll use imageData field for any file type
							isImage: false,
							contentType: contentType,
						};
					}
				}
			}

			// Fallback: Check if this is image data by content patterns
			if (
				parsed?.data &&
				typeof parsed.data === "string" &&
				parsed.data.startsWith("/9j/")
			) {
				// This is JPEG image data
				return {
					content: "JPEG image generated successfully",
					imageData: parsed.data,
					isImage: true,
					contentType: "image/jpeg",
				};
			}

			// Check for fileData in the response (fallback)
			if (parsed?.fileData && typeof parsed.fileData === "string") {
				if (parsed.fileData.startsWith("/9j/")) {
					// JPEG image data
					return {
						content: "JPEG image generated successfully",
						imageData: parsed.fileData,
						isImage: true,
						contentType: "image/jpeg",
					};
				} else if (parsed.fileData.startsWith("data:image/")) {
					// Base64 encoded image with data URL
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

			// Handle nested data structure for text responses
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

		try {
			setIsExecuting(true);
			setPollingStatus(true);
			setWorkflowStatus("running");
			setIsInFeedbackMode(false);

			setChatMessages([]);
			setCurrentWorkflowData(null);

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
					// Check if all subnets are pending
					const allPending = data.subnets.every(
						(subnet: any) => subnet.status === "pending"
					);

					// Update chat messages using functional state update to avoid stale closures
					setChatMessages((prevMessages) => {
						const updatedMessages = [...prevMessages];

						// If all subnets are pending, don't show any messages until they start processing
						if (allPending) {
							// Remove any existing pending messages and return current messages
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "pending" &&
									msg.type !== "workflow_subnet"
							);
						} else {
							// Handle normal subnet updates (not all pending)
							data.subnets.forEach(
								(subnet: any, index: number) => {
									const existingMessageIndex =
										updatedMessages.findIndex(
											(msg) =>
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index
										);

									// Check if workflow is waiting for response
									const isWaitingResponse =
										data.workflowStatus ===
										"waiting_response";

									let subnetContent: string;
									if (
										isWaitingResponse &&
										subnet.status === "waiting_response"
									) {
										// When waiting for response, show just the result (question will be shown separately)
										const result = parseAgentResponse(
											subnet.data
										);
										if (result.content) {
											subnetContent = result.content;
										} else {
											subnetContent =
												"Processing completed";
										}
									} else if (
										subnet.status === "done" &&
										subnet.data
									) {
										const result = parseAgentResponse(
											subnet.data
										);
										subnetContent =
											result.content ||
											"Processing completed";
									} else if (
										subnet.status === "in_progress"
									) {
										subnetContent = "Processing...";
									} else if (subnet.status === "pending") {
										// Don't show pending messages to users
										subnetContent = "";
									} else if (subnet.status === "failed") {
										subnetContent = "Failed to process";
									} else {
										// For any other status, show a neutral message instead of "Failed to process"
										subnetContent = "Processing...";
									}

									// Only create/update messages if there's content to show
									if (
										subnetContent &&
										subnetContent.trim() !== ""
									) {
										// Parse the response to get image data if present
										const result = parseAgentResponse(
											subnet.data
										);

										if (existingMessageIndex >= 0) {
											// Update existing message
											updatedMessages[
												existingMessageIndex
											] = {
												...updatedMessages[
													existingMessageIndex
												],
												subnetStatus: subnet.status,
												content: subnetContent,
												imageData: result.imageData,
												isImage: result.isImage,
												contentType: result.contentType,
											};
										} else {
											// Create new message for this subnet
											const newMessage: ChatMsg = {
												id: `subnet_${index}_${Date.now()}`,
												type: "workflow_subnet",
												content: subnetContent,
												timestamp: new Date(),
												subnetStatus: subnet.status,
												toolName: subnet.toolName,
												subnetIndex: index,
												imageData: result.imageData,
												isImage: result.isImage,
												contentType: result.contentType,
											};

											updatedMessages.push(newMessage);
										}
									} else if (existingMessageIndex >= 0) {
										// Remove existing message if no content to show
										updatedMessages.splice(
											existingMessageIndex,
											1
										);
									}
								}
							);

							// Only add ONE question message when waiting for response, not one per subnet
							if (data.workflowStatus === "waiting_response") {
								// Find the first subnet that has a question
								const subnetWithQuestion = data.subnets.find(
									(subnet: any) =>
										subnet.status === "waiting_response" &&
										subnet.question
								);

								if (subnetWithQuestion) {
									// Check if we already have a question message
									const existingQuestionIndex =
										updatedMessages.findIndex(
											(msg) => msg.type === "question"
										);

									if (existingQuestionIndex === -1) {
										// Add only one question message
										const questionMessage: ChatMsg = {
											id: `question_${Date.now()}`,
											type: "question",
											content:
												subnetWithQuestion.question
													.text,
											timestamp: new Date(),
											toolName:
												subnetWithQuestion.toolName,
											questionData:
												subnetWithQuestion.question,
										};

										updatedMessages.push(questionMessage);
									} else {
										console.log(
											"⏭️ Skipping duplicate question message"
										);
									}
								} else {
									console.log(
										"⚠️ No subnet with question found"
									);
								}
							}

							// Remove any old pending messages that are no longer relevant
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "workflow_subnet" ||
									data.subnets.some(
										(subnet: any, index: number) =>
											index === msg.subnetIndex
									)
							);
						}
					});

					// Check if workflow is completed, failed, stopped, or waiting for response
					if (data.workflowStatus === "completed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("completed");
						setIsInFeedbackMode(false);

						// Add completion message
						const completionMessage: ChatMsg = {
							id: `completion_${Date.now()}`,
							type: "response",
							content: "Workflow executed",
							timestamp: new Date(),
						};
						setChatMessages((prev) => [...prev, completionMessage]);
					} else if (data.workflowStatus === "failed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("failed");
						setIsInFeedbackMode(false);
					} else if (data.workflowStatus === "stopped") {
						// Workflow has been stopped (either by user or system)
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("stopped");
						setIsInFeedbackMode(false);

						// Preserve the workflow ID for resume operations
						if (data.requestId && !currentWorkflowId) {
							setCurrentWorkflowId(data.requestId);
						}

						// Notify workflow executor about external status change
						workflowExecutor.handleExternalStatusChange("stopped");
					} else if (data.workflowStatus === "in_progress") {
						// Workflow is in progress, keep executing state
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("in_progress");
						setIsInFeedbackMode(false);
					} else if (data.workflowStatus === "waiting_response") {
						// Keep executing state true when waiting for response to show feedback UI
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("waiting_response");
						setIsInFeedbackMode(true);
					}
				}
			};

			const workflowId = await workflowExecutor.executeAgentWorkflow(
				selectedAgent as any,
				message,
				address,
				skyBrowser,
				{ address },
				onStatusUpdate
			);

			setCurrentWorkflowId(workflowId);

			workflowExecutor.setCurrentWorkflowId(workflowId);

			setPrompt("");
		} catch (error) {
			console.error("Error executing workflow:", error);
			setIsExecuting(false);
			setPollingStatus(false);
			setWorkflowStatus("failed");
		}
	};

	// Handle feedback response submission
	const handleFeedbackResponse = async (feedback: string) => {
		if (!currentWorkflowId || !skyBrowser || !address) {
			console.error("Missing required data for feedback submission");
			return;
		}

		try {
			// Set loading state
			setIsSubmittingFeedback(true);

			// Add the feedback as a feedback answer message (not a user prompt)
			const feedbackMessage: ChatMsg = {
				id: `feedback_${Date.now()}`,
				type: "answer",
				content: feedback,
				timestamp: new Date(),
			};

			setChatMessages((prev) => [...prev, feedbackMessage]);

			// Submit feedback to the workflow via the NFT_USER_AGENT_URL endpoint
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

			// Remove the "submitting feedback" message if it exists
			setChatMessages((prev) =>
				prev.filter((msg) => msg.content !== "Submitting feedback...")
			);

			// Add error message to chat
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
			// Always clear loading state
			setIsSubmittingFeedback(false);
		}
	};

	const handleStopExecution = async () => {
		if (!skyBrowser || !address || !currentWorkflowId) {
			console.warn("Cannot stop execution: missing required data");
			return;
		}

		try {
			// Call emergency stop API
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
			} else {
				console.error("❌ Failed to emergency stop workflow");
			}
		} catch (error) {
			console.error("Error during emergency stop:", error);
			// Fallback: just stop locally
			setIsExecuting(false);
			setPollingStatus(false);
			setWorkflowStatus("stopped");
		}
	};

	const handleResumeExecution = async () => {
		if (!skyBrowser || !address || !currentWorkflowId) {
			console.warn("Cannot resume execution: missing required data");
			return;
		}

		try {
			// Create a new status callback with access to current state
			const newStatusCallback = (data: any) => {
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
					const allPending = data.subnets.every(
						(subnet: any) => subnet.status === "pending"
					);

					setChatMessages((prevMessages) => {
						const updatedMessages = [...prevMessages];

						if (allPending) {
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "pending" &&
									msg.type !== "workflow_subnet"
							);
						} else {
							// Handle normal subnet updates (not all pending)
							data.subnets.forEach(
								(subnet: any, index: number) => {
									const existingMessageIndex =
										updatedMessages.findIndex(
											(msg) =>
												msg.type ===
													"workflow_subnet" &&
												msg.subnetIndex === index
										);

									// Check if workflow is waiting for response
									const isWaitingResponse =
										data.workflowStatus ===
										"waiting_response";

									let subnetContent: string;
									if (
										isWaitingResponse &&
										subnet.status === "waiting_response"
									) {
										// When waiting for response, show just the result (question will be shown separately)
										const result = parseAgentResponse(
											subnet.data
										);
										if (result.content) {
											subnetContent = result.content;
										} else {
											subnetContent =
												"Processing completed";
										}
									} else if (
										subnet.status === "done" &&
										subnet.data
									) {
										const result = parseAgentResponse(
											subnet.data
										);
										subnetContent =
											result.content ||
											"Processing completed";
									} else if (
										subnet.status === "in_progress"
									) {
										subnetContent = "Processing...";
									} else if (subnet.status === "pending") {
										// Don't show pending messages to users
										subnetContent = "";
									} else if (subnet.status === "failed") {
										subnetContent = "Failed to process";
									} else {
										// For any other status, show a neutral message instead of "Failed to process"
										subnetContent = "Processing...";
									}

									// Only create/update messages if there's content to show
									if (
										subnetContent &&
										subnetContent.trim() !== ""
									) {
										// Parse the response to get image data if present
										const result = parseAgentResponse(
											subnet.data
										);

										if (existingMessageIndex >= 0) {
											// Update existing message
											updatedMessages[
												existingMessageIndex
											] = {
												...updatedMessages[
													existingMessageIndex
												],
												subnetStatus: subnet.status,
												content: subnetContent,
												imageData: result.imageData,
												isImage: result.isImage,
												contentType: result.contentType,
											};
										} else {
											// Create new message for this subnet
											const newMessage: ChatMsg = {
												id: `subnet_${index}_${Date.now()}`,
												type: "workflow_subnet",
												content: subnetContent,
												timestamp: new Date(),
												subnetStatus: subnet.status,
												toolName: subnet.toolName,
												subnetIndex: index,
												imageData: result.imageData,
												isImage: result.isImage,
												contentType: result.contentType,
											};

											updatedMessages.push(newMessage);
										}
									} else if (existingMessageIndex >= 0) {
										// Remove existing message if no content to show
										updatedMessages.splice(
											existingMessageIndex,
											1
										);
									}
								}
							);

							// Only add ONE question message when waiting for response, not one per subnet
							if (data.workflowStatus === "waiting_response") {
								// Find the first subnet that has a question
								const subnetWithQuestion = data.subnets.find(
									(subnet: any) =>
										subnet.status === "waiting_response" &&
										subnet.question
								);

								if (subnetWithQuestion) {
									// Check if we already have a question message
									const existingQuestionIndex =
										updatedMessages.findIndex(
											(msg) => msg.type === "question"
										);

									if (existingQuestionIndex === -1) {
										// Add only one question message
										const questionMessage: ChatMsg = {
											id: `question_${Date.now()}`,
											type: "question",
											content:
												subnetWithQuestion.question
													.text,
											timestamp: new Date(),
											toolName:
												subnetWithQuestion.toolName,
											questionData:
												subnetWithQuestion.question,
										};

										updatedMessages.push(questionMessage);
									} else {
										console.log(
											"⏭️ Skipping duplicate question message"
										);
									}
								} else {
									console.log(
										"⚠️ No subnet with question found"
									);
								}
							}

							// Remove any old pending messages that are no longer relevant
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "workflow_subnet" ||
									data.subnets.some(
										(subnet: any, index: number) =>
											index === msg.subnetIndex
									)
							);
						}
					});

					// Check if workflow is completed, failed, stopped, or waiting for response
					if (data.workflowStatus === "completed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("completed");
						setIsInFeedbackMode(false);

						// Add completion message
						const completionMessage: ChatMsg = {
							id: `completion_${Date.now()}`,
							type: "response",
							content: "Workflow executed",
							timestamp: new Date(),
						};
						setChatMessages((prev) => [...prev, completionMessage]);
					} else if (data.workflowStatus === "failed") {
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("failed");
						setIsInFeedbackMode(false);
					} else if (data.workflowStatus === "stopped") {
						// Workflow has been stopped (either by user or system)
						setIsExecuting(false);
						setPollingStatus(false);
						setWorkflowStatus("stopped");
						setIsInFeedbackMode(false);

						if (data.requestId && !currentWorkflowId) {
							setCurrentWorkflowId(data.requestId);
						}

						workflowExecutor.handleExternalStatusChange("stopped");
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

	// Auto-submit prompt after navigation from create page once everything is ready
	useEffect(() => {
		if (isLoading) return;
		if (hasAutoSubmittedRef.current) return;
		if (
			selectedAgent &&
			selectedAgent.id === agentId &&
			prompt &&
			prompt.trim().length > 0 &&
			skyBrowser &&
			address &&
			!isExecuting &&
			!isSubmittingFeedback &&
			chatMessages.length === 0
		) {
			hasAutoSubmittedRef.current = true;
			handlePromptSubmit(prompt);
		}
	}, [
		isLoading,
		selectedAgent,
		agentId,
		prompt,
		skyBrowser,
		address,
		isExecuting,
		isSubmittingFeedback,
		chatMessages.length,
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-center">
					<p className="text-muted-foreground">Loading agent...</p>
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
					<div className="flex items-center justify-center h-full min-h-[400px]">
						<div className="text-center text-gray-500">
							<p className="text-lg font-medium">
								Start a conversation with {selectedAgent?.name}
							</p>
							<p className="text-sm mt-2 text-gray-400">
								Type your request below to begin
							</p>
						</div>
					</div>
				) : (
					<div className="overflow-y-auto scrollbar-thin h-[calc(100vh-10rem)]">
						{chatMessages.map((message) => (
							<ChatMessage key={message.id} message={message} />
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
						isExecuting ||
						isSubmittingFeedback ||
						currentExecution?.workflowStatus === "in_progress" ||
						currentExecution?.workflowStatus === "pending" ||
						currentExecution?.workflowStatus === "waiting_response"
					}
					workflowStatus={
						currentWorkflowData?.workflowStatus ===
						"waiting_response"
							? "waiting_response"
							: workflowStatus
					}
				/>
			</div>
		</div>
	);
}
