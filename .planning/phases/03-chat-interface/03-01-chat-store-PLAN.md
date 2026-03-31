---
phase: 3
plan: 1
title: Chat Store and Types
wave: 1
depends_on: []
files_modified:
  - lib/chat/types.ts
  - lib/chat/index.ts
  - lib/stores/chat-store.ts
  - lib/stores/index.ts
requirements_addressed: [CURA-01]
autonomous: true
---

<objective>
Create the Zustand chat store with sessionStorage persistence and TypeScript types for the chat interface.

Purpose: Establish the data layer for chat messages so UI components can display and submit messages.
Output: Working chat store with add/clear messages, loading states, and session persistence.
</objective>

<must_haves>
- Chat message types (user message, assistant message, error state)
- Zustand store with messages array
- Add message action with timestamp
- Clear messages action
- Loading state tracking
- Error state with retry capability
- sessionStorage persistence (survives page refresh)
- Messages limited to prevent unbounded growth (max 100)
</must_haves>

<task id="1">
<title>Create Chat Types</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/types.ts (for pattern reference)
</read_first>
<action>
Create lib/chat/types.ts with message types:

```typescript
// Chat types for Vibe DJ conversational interface

export type MessageRole = "user" | "assistant" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number; // Unix timestamp in ms
}

// For error messages with retry capability
export interface ErrorMessage extends ChatMessage {
  role: "error";
  retryable: boolean;
  originalPrompt?: string; // The user message that caused the error
}

// Vibe interpretation result (Phase 4 will use this)
export interface VibeInterpretation {
  genres: string[];
  energy: number; // 0-1
  valence: number; // 0-1 (happiness/positivity)
  tempo?: { min: number; max: number };
  instrumentalness?: number; // 0-1
  exclusions: {
    genres: string[];
    artists: string[];
  };
  seedArtists?: string[];
  seedTracks?: string[];
}
```

Create lib/chat/index.ts barrel export:

```typescript
export * from "./types";
```
</action>
<acceptance_criteria>
- `lib/chat/types.ts` contains `export type MessageRole =`
- `lib/chat/types.ts` contains `export interface ChatMessage {`
- `lib/chat/types.ts` contains `export interface VibeInterpretation {`
- `lib/chat/index.ts` contains `export * from "./types"`
- TypeScript compiles without errors: `npx tsc --noEmit`
</acceptance_criteria>
</task>

<task id="2">
<title>Create Chat Store</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/queue-store.ts (for Zustand persist pattern)
</read_first>
<action>
Create lib/stores/chat-store.ts following the queue-store pattern:

```typescript
// Chat store using Zustand with sessionStorage persistence
// Manages conversation history and loading states

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ChatMessage, ErrorMessage } from "@/lib/chat/types";

interface ChatStore {
  // Messages state
  messages: ChatMessage[];

  // Loading state
  isLoading: boolean;

  // Current error (if any)
  currentError: ErrorMessage | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => string;
  addErrorMessage: (error: Omit<ErrorMessage, "id" | "timestamp">) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
  clearMessages: () => void;
  retryLastMessage: () => string | null;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      // Initial state
      messages: [],
      isLoading: false,
      currentError: null,

      // Add a message to the chat
      addMessage: (message) => {
        const id = crypto.randomUUID();
        const newMessage: ChatMessage = {
          ...message,
          id,
          timestamp: Date.now(),
        };

        set((state) => {
          // Limit to 100 messages (oldest removed first)
          const newMessages = [...state.messages, newMessage].slice(-100);
          return {
            messages: newMessages,
            currentError: null, // Clear error on successful message
          };
        });

        return id;
      },

      // Add an error message
      addErrorMessage: (error) => {
        const errorMessage: ErrorMessage = {
          ...error,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          role: "error",
        };

        set((state) => ({
          messages: [...state.messages, errorMessage].slice(-100),
          currentError: errorMessage,
          isLoading: false,
        }));
      },

      // Set loading state
      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      // Clear current error
      clearError: () => {
        set({ currentError: null });
      },

      // Clear all messages
      clearMessages: () => {
        set({ messages: [], currentError: null });
      },

      // Retry the last user message (returns the prompt or null)
      retryLastMessage: () => {
        const { messages, currentError } = get();

        // If there's a current error with an original prompt, use that
        if (currentError?.originalPrompt) {
          // Remove the error message
          set((state) => ({
            messages: state.messages.filter((m) => m.id !== currentError.id),
            currentError: null,
          }));
          return currentError.originalPrompt;
        }

        // Otherwise, find the last user message
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === "user") {
            return messages[i].content;
          }
        }

        return null;
      },
    }),
    {
      name: "vibe-dj-chat",
      storage: createJSONStorage(() => sessionStorage),
      // Persist messages and sessionId
      partialize: (state) => ({
        messages: state.messages,
      }),
    }
  )
);
```
</action>
<acceptance_criteria>
- `lib/stores/chat-store.ts` contains `export const useChatStore =`
- `lib/stores/chat-store.ts` contains `addMessage:`
- `lib/stores/chat-store.ts` contains `addErrorMessage:`
- `lib/stores/chat-store.ts` contains `retryLastMessage:`
- `lib/stores/chat-store.ts` contains `persist(` for sessionStorage
- Store uses `slice(-100)` to limit messages
- TypeScript compiles without errors: `npx tsc --noEmit`
</acceptance_criteria>
</task>

<task id="3">
<title>Update Store Index Exports</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/index.ts
</read_first>
<action>
Update lib/stores/index.ts to export the chat store:

Add:
```typescript
export { useChatStore } from "./chat-store";
```
</action>
<acceptance_criteria>
- `lib/stores/index.ts` contains `export { useChatStore }`
- TypeScript compiles without errors: `npx tsc --noEmit`
- `npm run build` succeeds
</acceptance_criteria>
</task>

<verification>
Run these commands to verify the store is complete:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. Files exist
ls -la lib/chat/
ls -la lib/stores/chat-store.ts
```
</verification>
