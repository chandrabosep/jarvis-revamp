import { useCallback, useEffect, useRef, useState } from "react";

export const useChatScroll = () => {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const chatContainerRef = useRef<HTMLDivElement>(null);
	const [isUserScrolling, setIsUserScrolling] = useState(false);
	const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const lastMessageCountRef = useRef(0);

	// Auto-scroll to bottom when new messages arrive
	const scrollToBottom = useCallback(() => {
		if (messagesEndRef.current && !isUserScrolling) {
			messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
		}
	}, [isUserScrolling]);

	// Handle scroll events to detect user scrolling
	const handleScroll = useCallback(() => {
		if (!chatContainerRef.current) return;

		const { scrollTop, scrollHeight, clientHeight } =
			chatContainerRef.current;
		const isAtBottom = scrollHeight - scrollTop - clientHeight < 50; // 50px threshold

		// If user is not at the bottom, they are scrolling
		if (!isAtBottom) {
			setIsUserScrolling(true);
		} else {
			setIsUserScrolling(false);
		}

		// Clear existing timeout
		if (scrollTimeoutRef.current) {
			clearTimeout(scrollTimeoutRef.current);
		}

		// Set timeout to reset scrolling state after user stops scrolling
		scrollTimeoutRef.current = setTimeout(() => {
			const { scrollTop, scrollHeight, clientHeight } =
				chatContainerRef.current!;
			const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

			if (isAtBottom) {
				setIsUserScrolling(false);
			}
		}, 1000); // 1 second after user stops scrolling
	}, []);

	// Effect to scroll to bottom when new messages arrive
	const useScrollOnNewMessages = (messageCount: number) => {
		useEffect(() => {
			if (messageCount > lastMessageCountRef.current) {
				scrollToBottom();
			}
			lastMessageCountRef.current = messageCount;
		}, [messageCount, scrollToBottom]);
	};

	// Cleanup scroll timeout on unmount
	useEffect(() => {
		return () => {
			if (scrollTimeoutRef.current) {
				clearTimeout(scrollTimeoutRef.current);
			}
		};
	}, []);

	return {
		messagesEndRef,
		chatContainerRef,
		isUserScrolling,
		handleScroll,
		scrollToBottom,
		useScrollOnNewMessages,
	};
};
