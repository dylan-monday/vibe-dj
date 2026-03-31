---
phase: 3
plan: 2
title: Chat UI Components
wave: 1
depends_on: [03-01-chat-store]
files_modified:
  - components/chat/chat-input.tsx
  - components/chat/chat-message.tsx
  - components/chat/chat-panel.tsx
  - components/chat/index.ts
  - app/page.tsx
requirements_addressed: [CURA-01, UI-01]
autonomous: true
---

<objective>
Create the chat UI components: input field, message display, and chat panel. Integrate into main page.

Purpose: Enable users to type messages and see conversation history in a chat-style interface.
Output: Working chat UI with input, messages, loading states, and error display.
</objective>

<must_haves>
- Text input field with send button (Enter key submits)
- Message display in chat thread format
- User messages visually distinct from assistant messages
- Loading state with animated indicator during processing
- Error messages with retry button
- Touch-friendly (44px+ touch targets)
- Mobile-responsive layout
- Smooth scrolling to latest message
- Empty state with helpful prompt
</must_haves>

<task id="1">
<title>Create ChatMessage Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/components/player/track-item.tsx (for component pattern)
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/chat/types.ts (for message types)
</read_first>
<action>
Create components/chat/chat-message.tsx:

```typescript
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
```
</action>
<acceptance_criteria>
- `components/chat/chat-message.tsx` exists
- Contains user vs assistant styling (different background colors)
- Contains error state with retry button
- Touch target for retry button is 44px+
- Uses rounded bubble styling
</acceptance_criteria>
</task>

<task id="2">
<title>Create ChatInput Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/chat-store.ts
</read_first>
<action>
Create components/chat/chat-input.tsx:

```typescript
"use client";

import { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSubmit,
  isLoading,
  placeholder = "Describe the vibe you want...",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim() && !isLoading) {
      onSubmit(value.trim());
      setValue("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2 p-4 bg-background border-t border-surface"
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        rows={1}
        className="flex-1 resize-none bg-surface rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 min-h-[48px] max-h-[120px]"
      />
      <button
        type="submit"
        disabled={!value.trim() || isLoading}
        className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary-dark transition-colors active:scale-95"
        aria-label="Send message"
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        )}
      </button>
    </form>
  );
}
```
</action>
<acceptance_criteria>
- `components/chat/chat-input.tsx` exists
- Contains auto-resizing textarea
- Enter key submits (Shift+Enter for newline)
- Send button is 48px (touch-friendly)
- Loading state shows spinner
- Disabled state when empty or loading
</acceptance_criteria>
</task>

<task id="3">
<title>Create ChatPanel Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/chat-store.ts
</read_first>
<action>
Create components/chat/chat-panel.tsx (the container that combines everything):

```typescript
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
```
</action>
<acceptance_criteria>
- `components/chat/chat-panel.tsx` exists
- Contains message list with auto-scroll
- Contains empty state with example prompts
- Contains loading indicator ("Thinking...")
- Contains ChatInput at bottom
- Handles message submission
- Handles retry functionality
</acceptance_criteria>
</task>

<task id="4">
<title>Create Chat Index Exports</title>
<action>
Create components/chat/index.ts barrel export:

```typescript
export { ChatInput } from "./chat-input";
export { ChatMessage } from "./chat-message";
export { ChatPanel } from "./chat-panel";
```
</action>
<acceptance_criteria>
- `components/chat/index.ts` exports all components
- TypeScript compiles without errors
</acceptance_criteria>
</task>

<task id="5">
<title>Integrate Chat into Main Page</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/page.tsx
</read_first>
<action>
Update app/page.tsx to add a "Chat" tab alongside Queue and History:

1. Add import: `import { ChatPanel } from "@/components/chat";`
2. Extend TabId type: `type TabId = "chat" | "queue" | "history";`
3. Change default tab to "chat": `const [activeTab, setActiveTab] = useState<TabId>("chat");`
4. Add Chat tab button in the tab headers section
5. Add ChatPanel render in tab content area

The tab section should look like:
```typescript
{/* Tab headers */}
<div className="flex border-b border-surface">
  <button
    onClick={() => setActiveTab("chat")}
    className={`flex-1 py-3 text-sm font-medium transition-colors ${
      activeTab === "chat"
        ? "text-primary border-b-2 border-primary"
        : "text-foreground/60 hover:text-foreground"
    }`}
  >
    Chat
  </button>
  <button
    onClick={() => setActiveTab("queue")}
    className={`flex-1 py-3 text-sm font-medium transition-colors ${
      activeTab === "queue"
        ? "text-primary border-b-2 border-primary"
        : "text-foreground/60 hover:text-foreground"
    }`}
  >
    Up Next
  </button>
  <button
    onClick={() => setActiveTab("history")}
    className={`flex-1 py-3 text-sm font-medium transition-colors ${
      activeTab === "history"
        ? "text-primary border-b-2 border-primary"
        : "text-foreground/60 hover:text-foreground"
    }`}
  >
    History
  </button>
</div>

{/* Tab content */}
<div className="flex-1 bg-surface/30 flex flex-col min-h-[300px]">
  {activeTab === "chat" && <ChatPanel />}
  {activeTab === "queue" && <QueueList maxTracks={10} />}
  {activeTab === "history" && <HistoryList maxTracks={20} />}
</div>
```
</action>
<acceptance_criteria>
- `app/page.tsx` imports ChatPanel
- Contains 3 tabs: Chat, Up Next, History
- Chat is the default active tab
- ChatPanel renders when Chat tab is active
- Tab area has minimum height (300px) for chat usability
- `npm run build` succeeds
</acceptance_criteria>
</task>

<verification>
Run these commands to verify the chat UI is complete:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. Files exist
ls -la components/chat/

# 4. Dev server (manual check)
npm run dev
# Visit http://localhost:3000
# Should see Chat tab with input field
# Can type messages and see them appear
```
</verification>
