"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";

export function ChatPanel() {
  const { messages, isLoading, currentError, addMessage, retryLastMessage } =
    useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = (content: string) => {
    // Add user message
    addMessage({ role: "user", content });

    // TODO: Phase 4 will add AI processing here
    // For now, add a placeholder assistant response
    setTimeout(() => {
      addMessage({
        role: "assistant",
        content:
          "I understand you want to hear something like that! AI curation coming in Phase 4. For now, enjoy the player controls above.",
      });
    }, 1000);
  };

  const handleRetry = () => {
    const prompt = retryLastMessage();
    if (prompt) {
      handleSubmit(prompt);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Describe your vibe
            </h3>
            <p className="text-sm text-foreground/60 max-w-xs">
              Try &quot;cooking hard bop, no ballads&quot; or &quot;Friday afternoon coding
              energy&quot;
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={
                  message.role === "error" && currentError?.id === message.id
                    ? handleRetry
                    : undefined
                }
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-2 text-foreground/60">
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-sm">Thinking...</span>
        </div>
      )}

      {/* Input area */}
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
