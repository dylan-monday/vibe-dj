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
