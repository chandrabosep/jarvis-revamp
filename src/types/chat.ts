export type ChatMsg = {
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

export type WorkflowStatus =
	| "running"
	| "stopped"
	| "completed"
	| "failed"
	| "waiting_response"
	| "in_progress";

export interface AgentResponse {
	content: string | null;
	imageData?: string;
	isImage?: boolean;
	contentType?: string;
}

export interface StatusTransition {
	prev: string | undefined;
	current: string;
	isRegenerating: boolean;
	isShowingQuestion: boolean;
}

export interface FeedbackState {
	preFeedbackContent: Map<number, string>;
	feedbackGivenForSubnet: Set<number>;
	subnetPreviousStatus: Map<number, string>;
	postFeedbackProcessing: Map<number, boolean>;
}
