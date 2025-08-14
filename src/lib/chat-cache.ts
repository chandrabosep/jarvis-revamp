import { ChatMsg } from "@/types/chat";

const chatCache = new Map<string, ChatMsg[]>();

export const chatCacheService = {
	getCachedMessages: (workflowId: string): ChatMsg[] | undefined => {
		return chatCache.get(workflowId);
	},

	setCachedMessages: (workflowId: string, messages: ChatMsg[]): void => {
		chatCache.set(workflowId, messages);
	},

	addMessageToCache: (workflowId: string, message: ChatMsg): void => {
		const existing = chatCache.get(workflowId) || [];
		chatCache.set(workflowId, [...existing, message]);
	},

	updateCachedMessages: (workflowId: string, messages: ChatMsg[]): void => {
		chatCache.set(workflowId, messages);
	},

	clearWorkflowCache: (workflowId: string): void => {
		chatCache.delete(workflowId);
	},

	clearAllCache: (): void => {
		chatCache.clear();
	},

	getCachedWorkflowIds: (): string[] => {
		return Array.from(chatCache.keys());
	},

	hasCachedMessages: (workflowId: string): boolean => {
		return chatCache.has(workflowId);
	},
};
