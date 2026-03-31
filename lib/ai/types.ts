// AI module types
// Re-exports VibeInterpretation from chat types for convenience

export type { VibeInterpretation } from "@/lib/chat/types";

// Clarification question when vibe is ambiguous
export interface ClarificationQuestion {
  question: string;
  options?: string[]; // Quick suggestions the user can tap
}

// Claude API response wrapper
export interface InterpretationResult {
  success: boolean;
  interpretation?: import("@/lib/chat/types").VibeInterpretation;
  needsClarification?: boolean;
  clarification?: ClarificationQuestion;
  error?: string;
  responseTimeMs: number;
}

// Session context for interpretation
export interface SessionContext {
  playedTrackIds: string[];
  excludedGenres: string[];
  excludedArtists: string[];
  previousVibes: import("@/lib/chat/types").VibeInterpretation[];
}

// Refinement command types
export type RefinementType =
  | "energy_up" // "too mellow", "more energy"
  | "energy_down" // "too intense", "calmer"
  | "valence_up" // "happier", "more upbeat"
  | "valence_down" // "darker", "moodier"
  | "more_like_this" // "more like that one", "similar to this"
  | "exclude" // "no more X", "skip X"
  | "new_vibe"; // Fresh vibe request (not a refinement)

export interface RefinementResult {
  type: RefinementType;
  adjustments?: {
    energyDelta?: number; // -0.3 to +0.3
    valenceDelta?: number; // -0.3 to +0.3
  };
  exclusions?: {
    genres: string[];
    artists: string[];
  };
  seedFromCurrent?: boolean;
  newVibe?: import("@/lib/chat/types").VibeInterpretation;
}

export interface RefineInterpretationResult {
  success: boolean;
  refinement?: RefinementResult;
  error?: string;
  responseTimeMs: number;
}
