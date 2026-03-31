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
