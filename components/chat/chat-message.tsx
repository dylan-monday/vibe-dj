"use client";

import { ChatMessage as ChatMessageType, ErrorMessage } from "@/lib/chat/types";

interface ChatMessageProps {
  message: ChatMessageType;
  onRetry?: () => void;
}

export function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isError = message.role === "error";
  const errorMessage = message as ErrorMessage;

  // Format timestamp
  const time = new Date(message.timestamp).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 px-4">
        <div className="flex items-center gap-2 text-red-400">
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm">{message.content}</span>
        </div>
        {errorMessage.retryable && onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium bg-surface hover:bg-surface-elevated rounded-lg transition-colors min-h-[44px]"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3 px-4`}
    >
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-primary text-white rounded-br-sm"
            : "bg-surface text-foreground rounded-bl-sm"
        }`}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <p
          className={`text-xs mt-1 ${
            isUser ? "text-white/60" : "text-foreground/40"
          }`}
        >
          {time}
        </p>
      </div>
    </div>
  );
}
