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
};

export default function AgentChatPage() {
	// Check if required environment variables are configured
	useEffect(() => {
		const nftUserAgentUrl = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL;
		if (!nftUserAgentUrl) {
			console.error(
				"❌ NEXT_PUBLIC_NFT_USER_AGENT_URL environment variable is not configured"
			);
		} else {
			console.log(
				"✅ NEXT_PUBLIC_NFT_USER_AGENT_URL configured:",
				nftUserAgentUrl
			);
		}
	}, []);

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
		"running" | "stopped" | "completed" | "failed" | "waiting_response"
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

	const handleModeChange = (newMode: "chat" | "agent") => {
		if (newMode === "chat") {
			setSelectedAgent(null);
			router.push("/chat");
		} else {
			setMode(newMode);
		}
	};

	// Helper: Parse agent response from workflow result
	const parseAgentResponse = (subnetData: string): string | null => {
		try {
			const parsed = JSON.parse(subnetData);

			// Handle nested data structure
			if (parsed?.data?.data?.choices?.[0]?.message?.content) {
				return parsed.data.data.choices[0].message.content;
			}
			if (parsed?.data?.choices?.[0]?.message?.content) {
				return parsed.data.choices[0].message.content;
			}
			if (parsed?.data?.message) {
				return parsed.data.message;
			}
			if (parsed?.message) {
				return parsed.message;
			}
			return null;
		} catch {
			return null;
		}
	};

	const handlePromptSubmit = async (
		message: string,
		selectedAgentId?: string
	) => {
		if (!message.trim() || !selectedAgent || !skyBrowser || !address)
			return;

		// Check if we're currently in feedback mode
		if (
			isInFeedbackMode ||
			currentWorkflowData?.workflowStatus === "waiting_response"
		) {
			console.log(
				"🔄 Detected feedback mode, handling feedback response",
				{
					isInFeedbackMode,
					workflowStatus: currentWorkflowData?.workflowStatus,
					message: message.substring(0, 50) + "...",
				}
			);
			// This is a feedback response, not a new prompt
			await handleFeedbackResponse(message);
			return;
		}

		console.log("🚀 Starting new workflow execution");
		try {
			setIsExecuting(true);
			setPollingStatus(true);
			setWorkflowStatus("running");
			setIsInFeedbackMode(false);

			// Clear ALL existing messages and start fresh
			setChatMessages([]);
			setCurrentWorkflowData(null);

			// Add the user's question as the first message
			const userMessage: ChatMsg = {
				id: `user_${Date.now()}`,
				type: "user",
				content: message,
				timestamp: new Date(),
			};

			setChatMessages([userMessage]);

			const onStatusUpdate = (data: any) => {
				console.log("📊 Workflow status update:", data);
				console.log("🔄 Current workflow status:", data.workflowStatus);
				console.log(
					"🔍 Workflow executor polling status:",
					workflowExecutor.isPolling()
				);
				console.log(
					"🔍 Current workflow ID in component:",
					currentWorkflowId
				);

				// Store current workflow data for progress display
				setCurrentWorkflowData(data);

				// Store workflow ID if available
				if (data?.requestId && !currentWorkflowId) {
					setCurrentWorkflowId(data.requestId);
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

						// If all subnets are pending, only show the first one
						if (allPending) {
							const firstSubnet = data.subnets[0];
							const existingMessageIndex =
								updatedMessages.findIndex(
									(msg) =>
										msg.type === "workflow_subnet" &&
										msg.subnetIndex === 0
								);

							const subnetContent = `Waiting to start...`;

							if (existingMessageIndex >= 0) {
								// Update existing message
								updatedMessages[existingMessageIndex] = {
									...updatedMessages[existingMessageIndex],
									subnetStatus: firstSubnet.status,
									content: subnetContent,
								};
							} else {
								// Create new message for the first subnet only
								const newMessage: ChatMsg = {
									id: `subnet_0_${Date.now()}`,
									type: "pending",
									content: "Waiting to start...",
									timestamp: new Date(),
									subnetStatus: firstSubnet.status,
									toolName: firstSubnet.toolName,
									subnetIndex: 0,
								};

								updatedMessages.push(newMessage);
							}

							// Remove any other subnet messages if they exist
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "workflow_subnet" ||
									msg.subnetIndex === 0
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
										if (result) {
											subnetContent = result;
										} else {
											subnetContent =
												"Processing completed";
										}
									} else if (
										subnet.status === "done" &&
										subnet.data
									) {
										subnetContent =
											parseAgentResponse(subnet.data) ||
											"Processing completed";
									} else if (
										subnet.status === "in_progress"
									) {
										subnetContent = "Processing...";
									} else if (subnet.status === "pending") {
										subnetContent = "Waiting to start...";
									} else if (subnet.status === "failed") {
										subnetContent = "Failed to process";
									} else {
										// For any other status, show a neutral message instead of "Failed to process"
										subnetContent = "Processing...";
									}

									if (existingMessageIndex >= 0) {
										// Update existing message
										updatedMessages[existingMessageIndex] =
											{
												...updatedMessages[
													existingMessageIndex
												],
												subnetStatus: subnet.status,
												content: subnetContent,
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
										};

										updatedMessages.push(newMessage);
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

									console.log(
										"🔍 Checking for existing question message:",
										{
											existingQuestionIndex,
											subnetWithQuestion:
												subnetWithQuestion.toolName,
											question:
												subnetWithQuestion.question
													.text,
										}
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
										};

										console.log(
											"✅ Adding new question message:",
											questionMessage
										);
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
						console.log("🛑 Workflow status updated to stopped");

						// Preserve the workflow ID for resume operations
						if (data.requestId && !currentWorkflowId) {
							setCurrentWorkflowId(data.requestId);
						}

						// Notify workflow executor about external status change
						workflowExecutor.handleExternalStatusChange("stopped");
					} else if (data.workflowStatus === "waiting_response") {
						// Keep executing state true when waiting for response to show feedback UI
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("waiting_response");
						setIsInFeedbackMode(true);
						console.log(
							"💬 Workflow waiting for user feedback - Feedback mode enabled"
						);
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

			// Store the workflow ID for resume/stop operations
			setCurrentWorkflowId(workflowId);

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
		console.log("💬 Handling feedback response:", feedback);
		console.log("🔍 Current polling status:", workflowExecutor.isPolling());
		console.log("🔍 Current workflow ID:", currentWorkflowId);

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

			console.log("📝 Adding feedback message to chat:", feedbackMessage);
			setChatMessages((prev) => [...prev, feedbackMessage]);

			// Submit feedback to the workflow via the NFT_USER_AGENT_URL endpoint
			const nftUserAgentUrl = process.env.NEXT_PUBLIC_NFT_USER_AGENT_URL;
			if (!nftUserAgentUrl) {
				console.error(
					"❌ NEXT_PUBLIC_NFT_USER_AGENT_URL environment variable is not configured"
				);
				// Add error message to chat
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

			// Get API key for authentication
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

			// Extract the question that needs to be answered
			const subnetWithQuestion = currentWorkflowData?.subnets?.find(
				(subnet: any) =>
					subnet.status === "waiting_response" && subnet.question
			);

			console.log("🔍 Found subnet with question:", {
				subnet: subnetWithQuestion?.toolName,
				status: subnetWithQuestion?.status,
				question: subnetWithQuestion?.question?.text,
			});

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

			console.log("🚀 Submitting feedback to workflow:", contextPayload);
			console.log("❓ Answering question:", contextPayload.question);

			// Add a "submitting feedback" message to show progress
			const submittingMessage: ChatMsg = {
				id: `submitting_${Date.now()}`,
				type: "response",
				content: "Submitting feedback...",
				timestamp: new Date(),
			};
			setChatMessages((prev) => [...prev, submittingMessage]);

			// Make the API call to submit feedback with API key header
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
			console.log("✅ Feedback submitted successfully:", result);

			// Remove the "submitting feedback" message and add success message
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

			// Clear the prompt after successful submission
			setPrompt("");

			// Update workflow status to indicate feedback was submitted
			// The workflow should continue processing after feedback is submitted
			setWorkflowStatus("running");
			setIsExecuting(true);
			setIsInFeedbackMode(false);
			console.log("✅ Feedback mode cleared, workflow continuing...");

			// Update the current workflow data to reflect the new status
			if (currentWorkflowData) {
				setCurrentWorkflowData({
					...currentWorkflowData,
					workflowStatus: "running",
				});
			}

			// Remove the continuation message - just show success and let the workflow continue silently

			// Verify that the workflow executor is still polling for this workflow
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

			// Log the current state for debugging
			console.log("🔄 Workflow state after feedback submission:", {
				workflowId: currentWorkflowId,
				workflowStatus: "running",
				isExecuting: true,
				isSubmittingFeedback: false,
			});
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
			console.log("🚨 Emergency stopping workflow:", currentWorkflowId);

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
				console.log("✅ Workflow emergency stopped successfully");
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
			console.log("▶️ Resuming workflow:", currentWorkflowId);

			// Create a new status callback with access to current state
			const newStatusCallback = (data: any) => {
				console.log("📊 Workflow status update (resumed):", data);
				console.log("🔄 Current workflow status:", data.workflowStatus);

				// Store current workflow data for progress display
				setCurrentWorkflowData(data);

				// Store workflow ID if available
				if (data?.requestId && !currentWorkflowId) {
					setCurrentWorkflowId(data.requestId);
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

						// If all subnets are pending, only show the first one
						if (allPending) {
							const firstSubnet = data.subnets[0];
							const existingMessageIndex =
								updatedMessages.findIndex(
									(msg) =>
										msg.type === "workflow_subnet" &&
										msg.subnetIndex === 0
								);

							const subnetContent = `Waiting to start...`;

							if (existingMessageIndex >= 0) {
								// Update existing message
								updatedMessages[existingMessageIndex] = {
									...updatedMessages[existingMessageIndex],
									subnetStatus: firstSubnet.status,
									content: subnetContent,
								};
							} else {
								// Create new message for the first subnet only
								const newMessage: ChatMsg = {
									id: `subnet_0_${Date.now()}`,
									type: "pending",
									content: "Waiting to start...",
									timestamp: new Date(),
									subnetStatus: firstSubnet.status,
									toolName: firstSubnet.toolName,
									subnetIndex: 0,
								};

								updatedMessages.push(newMessage);
							}

							// Remove any other subnet messages if they exist
							return updatedMessages.filter(
								(msg) =>
									msg.type !== "workflow_subnet" ||
									msg.subnetIndex === 0
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
										if (result) {
											subnetContent = result;
										} else {
											subnetContent =
												"Processing completed";
										}
									} else if (
										subnet.status === "done" &&
										subnet.data
									) {
										subnetContent =
											parseAgentResponse(subnet.data) ||
											"Processing completed";
									} else if (
										subnet.status === "in_progress"
									) {
										subnetContent = "Processing...";
									} else if (subnet.status === "pending") {
										subnetContent = "Waiting to start...";
									} else if (subnet.status === "failed") {
										subnetContent = "Failed to process";
									} else {
										// For any other status, show a neutral message instead of "Failed to process"
										subnetContent = "Processing...";
									}

									if (existingMessageIndex >= 0) {
										// Update existing message
										updatedMessages[existingMessageIndex] =
											{
												...updatedMessages[
													existingMessageIndex
												],
												subnetStatus: subnet.status,
												content: subnetContent,
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
										};

										updatedMessages.push(newMessage);
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

									console.log(
										"🔍 Checking for existing question message:",
										{
											existingQuestionIndex,
											subnetWithQuestion:
												subnetWithQuestion.toolName,
											question:
												subnetWithQuestion.question
													.text,
										}
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
										};

										console.log(
											"✅ Adding new question message:",
											questionMessage
										);
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
						console.log("🛑 Workflow status updated to stopped");

						// Preserve the workflow ID for resume operations
						if (data.requestId && !currentWorkflowId) {
							setCurrentWorkflowId(data.requestId);
						}

						// Notify workflow executor about external status change
						workflowExecutor.handleExternalStatusChange("stopped");
					} else if (data.workflowStatus === "waiting_response") {
						// Keep executing state true when waiting for response to show feedback UI
						setIsExecuting(true);
						setPollingStatus(true);
						setWorkflowStatus("waiting_response");
						setIsInFeedbackMode(true);
						console.log(
							"💬 Workflow waiting for user feedback - Feedback mode enabled"
						);
					}
				}
			};

			// Set the new callback in the executor
			workflowExecutor.setCurrentStatusCallback(newStatusCallback);

			// Call resume API
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
				console.log("✅ Workflow resumed successfully");
			} else {
				console.error("❌ Failed to resume workflow");
			}
		} catch (error) {
			console.error("Error during workflow resume:", error);
			// Fallback: just resume locally
			setIsExecuting(true);
			setPollingStatus(true);
			setWorkflowStatus("running");
		}
	};

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [chatMessages]);

	// Cleanup workflow when component unmounts
	useEffect(() => {
		return () => {
			// Only clear if the workflow is not in a resumable state
			if (currentWorkflowId && workflowStatus !== "stopped") {
				workflowExecutor.clearCurrentWorkflow();
			}
		};
	}, [currentWorkflowId, workflowStatus]);

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
					<div className="overflow-y-auto scrollbar-thin h-full">
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
