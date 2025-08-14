import { chatCacheService } from "@/lib/chat-cache";
import { ChatMsg } from "@/types/chat";

export const prefetchChatData = (workflowId: string, queryClient: any) => {
	if (!workflowId || chatCacheService.hasCachedMessages(workflowId)) {
		return;
	}

	queryClient.prefetchQuery({
		queryKey: ["chat", workflowId],
		queryFn: async () => {
			return chatCacheService.getCachedMessages(workflowId) || null;
		},
		staleTime: 1000 * 60 * 10,
		gcTime: 1000 * 60 * 60,
	});
};

export const getCachedChatMessages = (
	workflowId: string
): ChatMsg[] | undefined => {
	return chatCacheService.getCachedMessages(workflowId);
};

export const setCachedChatMessages = (
	workflowId: string,
	messages: ChatMsg[]
): void => {
	chatCacheService.setCachedMessages(workflowId, messages);
};

export const clearChatCache = (workflowId: string): void => {
	chatCacheService.clearWorkflowCache(workflowId);
};

export const hasCachedChatMessages = (workflowId: string): boolean => {
	return chatCacheService.hasCachedMessages(workflowId);
};
