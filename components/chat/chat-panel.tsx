"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useVibeCuration } from "@/lib/hooks/use-vibe-curation";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";
import { QuickActions } from "./quick-actions";
import { SessionActions } from "./session-actions";

export function ChatPanel() {
  const { messages, isLoading, currentError, addMessage, retryLastMessage } =
    useChatStore();
  const { processVibe, processRefinement, currentStep } = useVibeCuration();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (content: string) => {
    addMessage({ role: "user", content });
    await processVibe(content);
  };

  const handleRetry = async () => {
    const prompt = retryLastMessage();
    if (prompt) {
      await processVibe(prompt);
    }
  };

  const handleQuickAction = async (actionId: string) => {
    const actionMessages: Record<string, string> = {
      energy_up: "more energy",
      energy_down: "calmer please",
      more_like_this: "more like this",
    };

    const message = actionMessages[actionId];
    if (message) {
      addMessage({ role: "user", content: message });
      await processRefinement(message);
    }
  };

  // Step-specific loading message
  const getLoadingMessage = () => {
    switch (currentStep) {
      case "interpreting":
        return "Understanding your vibe...";
      case "recommending":
        return "Finding the perfect tracks...";
      case "playing":
        return "Starting playback...";
      default:
        return "Thinking...";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-20 h-20 rounded-2xl glass-elevated flex items-center justify-center mb-6">
              <svg
                className="w-10 h-10 text-primary"
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
            <h3 className="text-xl font-display text-foreground mb-3">
              Describe your vibe
            </h3>
            <p className="text-sm text-foreground/50 max-w-xs leading-relaxed">
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
        <div className="flex items-center gap-3 px-4 py-3 text-foreground/60">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-accent-magenta animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-accent-cyan animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-sm">{getLoadingMessage()}</span>
        </div>
      )}

      {/* Quick actions */}
      <QuickActions onAction={handleQuickAction} isDisabled={isLoading} />

      {/* Session actions (save playlist) */}
      <SessionActions />

      {/* Input area */}
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
