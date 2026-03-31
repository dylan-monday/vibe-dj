// AI module types
// Re-exports VibeInterpretation from chat types for convenience

export type { VibeInterpretation } from "@/lib/chat/types";

// Claude API response wrapper
export interface InterpretationResult {
  success: boolean;
  interpretation?: import("@/lib/chat/types").VibeInterpretation;
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
