"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useVibeCuration } from "@/lib/hooks/use-vibe-curation";
import { usePlaybackStore } from "@/lib/stores/playback-store";

export function ChatOverlay() {
  const { messages, isLoading, currentError, addMessage, retryLastMessage } =
    useChatStore();
  const { processVibe, processRefinement, currentStep, pendingClarification } =
    useVibeCuration();
  const { currentTrack } = usePlaybackStore();
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
    }
  }, [input]);

  // Expand when there are messages
  useEffect(() => {
    if (messages.length > 0) setExpanded(true);
  }, [messages.length]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const val = input.trim();
    if (!val || isLoading) return;

    addMessage({ role: "user", content: val });
    setInput("");
    setExpanded(true);
    await processVibe(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = async (action: string) => {
    const msgs: Record<string, string> = {
      energy_up: "more energy",
      energy_down: "calmer please",
      more_like_this: "more like this",
    };
    const msg = msgs[action];
    if (msg) {
      addMessage({ role: "user", content: msg });
      setExpanded(true);
      await processRefinement(msg);
    }
  };

  const handleClarificationOption = async (option: string) => {
    addMessage({ role: "user", content: option });
    await processVibe(option);
  };

  const handleRetry = async () => {
    const prompt = retryLastMessage();
    if (prompt) await processVibe(prompt);
  };

  // Loading step label
  const stepLabel = currentStep === "interpreting"
    ? "Reading the room..."
    : currentStep === "recommending"
      ? "Curating tracks..."
      : currentStep === "playing"
        ? "Starting playback..."
        : "";

  const visibleMessages = messages.slice(-6); // Show last 6 messages

  return (
    <div className="relative z-20 w-full">
      {/* Messages - floating above input */}
      {expanded && messages.length > 0 && (
        <div className="px-4 pb-2 max-h-[35dvh] overflow-y-auto">
          <div className="space-y-2">
            {visibleMessages.map((msg) => {
              const isUser = msg.role === "user";
              const isError = msg.role === "error";

              if (isError) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs">
                      <span>{msg.content}</span>
                      {currentError?.id === msg.id && (
                        <button
                          onClick={handleRetry}
                          className="underline hover:text-red-300"
                        >
                          retry
                        </button>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`
                      max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed
                      ${isUser
                        ? "bg-primary/80 text-white rounded-br-md"
                        : "bg-white/[0.07] text-foreground/80 rounded-bl-md backdrop-blur-md"
                      }
                    `}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl rounded-bl-md bg-white/[0.05] backdrop-blur-md">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-magenta animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  {stepLabel && (
                    <span className="text-xs text-foreground/40">{stepLabel}</span>
                  )}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Clarification options */}
      {pendingClarification?.options && pendingClarification.options.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-2">
          {pendingClarification.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleClarificationOption(opt)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full text-xs bg-white/[0.06] text-foreground/70 hover:bg-primary/20 hover:text-primary border border-white/[0.08] transition-all disabled:opacity-40"
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {/* Quick actions */}
      {currentTrack && !isLoading && (
        <div className="flex gap-1.5 px-4 pb-2">
          {[
            { id: "energy_up", label: "More Energy", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
            { id: "energy_down", label: "Calmer", icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" },
            { id: "more_like_this", label: "More Like This", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
          ].map((a) => (
            <button
              key={a.id}
              onClick={() => handleQuickAction(a.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-white/[0.04] text-foreground/40 hover:bg-white/[0.08] hover:text-foreground/70 border border-white/[0.06] transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={a.icon} />
              </svg>
              {a.label}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2 px-4 pb-4 pt-1"
      >
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setExpanded(true)}
            placeholder={currentTrack ? "Refine the vibe..." : "Describe the vibe you want..."}
            disabled={isLoading}
            rows={1}
            className="w-full resize-none rounded-2xl px-4 py-3 text-sm text-foreground bg-white/[0.06] border border-white/[0.08] backdrop-blur-xl placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 focus:bg-white/[0.08] transition-all min-h-[48px] max-h-[100px]"
          />
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0
            transition-all duration-200
            ${!input.trim() || isLoading
              ? "bg-white/[0.04] text-foreground/20"
              : "bg-primary text-white shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
            }
          `}
        >
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}
