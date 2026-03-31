// Claude-powered vibe interpretation
// Parses natural language into VibeInterpretation structure

import Anthropic from "@anthropic-ai/sdk";
import { VibeInterpretation } from "@/lib/chat/types";
import { InterpretationResult, SessionContext, ClarificationQuestion, CurationResult, SuggestedTrack } from "./types";
import {
  VIBE_INTERPRETER_SYSTEM_PROMPT,
  VIBE_INTERPRETER_USER_TEMPLATE,
  TRACK_CURATOR_SYSTEM_PROMPT,
  TRACK_CURATOR_USER_TEMPLATE,
} from "./prompts";

// Initialize Anthropic client (server-side only)
const anthropic = new Anthropic();

// Response type from Claude can be clarification or interpretation
interface ClarificationResponse {
  needsClarification: true;
  question: string;
  options?: string[];
}

interface DirectInterpretationResponse extends VibeInterpretation {
  needsClarification: false;
}

type ClaudeResponse = ClarificationResponse | DirectInterpretationResponse;

export async function interpretVibe(
  userMessage: string,
  context?: Partial<SessionContext>
): Promise<InterpretationResult> {
  const startTime = Date.now();

  try {
    const userPrompt = VIBE_INTERPRETER_USER_TEMPLATE(userMessage, {
      excludedGenres: context?.excludedGenres,
      excludedArtists: context?.excludedArtists,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: VIBE_INTERPRETER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const responseTimeMs = Date.now() - startTime;

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        error: "No text response from Claude",
        responseTimeMs,
      };
    }

    // Parse JSON response
    try {
      const parsed = JSON.parse(textContent.text) as ClaudeResponse;

      // Check if Claude is asking for clarification
      if (parsed.needsClarification === true) {
        const clarificationResponse = parsed as ClarificationResponse;
        const clarification: ClarificationQuestion = {
          question: clarificationResponse.question,
          options: clarificationResponse.options,
        };
        return {
          success: true,
          needsClarification: true,
          clarification,
          responseTimeMs,
        };
      }

      // Otherwise, it's a direct interpretation
      const interpretation = parsed as VibeInterpretation;

      // Validate required fields
      if (!interpretation.genres || !Array.isArray(interpretation.genres)) {
        return {
          success: false,
          error: "Invalid response: missing genres array",
          responseTimeMs,
        };
      }
      if (typeof interpretation.energy !== "number") {
        return {
          success: false,
          error: "Invalid response: missing energy",
          responseTimeMs,
        };
      }
      if (typeof interpretation.valence !== "number") {
        return {
          success: false,
          error: "Invalid response: missing valence",
          responseTimeMs,
        };
      }

      // Ensure exclusions object exists
      if (!interpretation.exclusions) {
        interpretation.exclusions = { genres: [], artists: [] };
      }

      // Merge with session exclusions
      if (context?.excludedGenres?.length) {
        interpretation.exclusions.genres = [
          ...new Set([
            ...interpretation.exclusions.genres,
            ...context.excludedGenres,
          ]),
        ];
      }
      if (context?.excludedArtists?.length) {
        interpretation.exclusions.artists = [
          ...new Set([
            ...interpretation.exclusions.artists,
            ...context.excludedArtists,
          ]),
        ];
      }

      return {
        success: true,
        needsClarification: false,
        interpretation,
        responseTimeMs,
      };
    } catch {
      return {
        success: false,
        error: `Failed to parse response: ${textContent.text.substring(0, 100)}...`,
        responseTimeMs,
      };
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
      responseTimeMs,
    };
  }
}

// Claude as direct track curator — returns specific artist/title pairs
// Spotify search validates existence; hallucinations are filtered naturally
export async function curateTracklist(
  userMessage: string,
  context?: {
    excludedGenres?: string[];
    excludedArtists?: string[];
    recentTracks?: Array<{ artist: string; title: string }>;
  }
): Promise<CurationResult> {
  const startTime = Date.now();

  try {
    const userPrompt = TRACK_CURATOR_USER_TEMPLATE(userMessage, context);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: TRACK_CURATOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseTimeMs = Date.now() - startTime;

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return { success: false, error: "No response from Claude", responseTimeMs };
    }

    let parsed: {
      needsClarification: boolean;
      tracks?: SuggestedTrack[];
      curatorNote?: string;
      question?: string;
      options?: string[];
    };

    try {
      parsed = JSON.parse(textContent.text);
    } catch {
      return {
        success: false,
        error: `Failed to parse curator response`,
        responseTimeMs,
      };
    }

    if (parsed.needsClarification) {
      return {
        success: true,
        needsClarification: true,
        clarification: {
          question: parsed.question || "Can you tell me more?",
          options: parsed.options,
        },
        responseTimeMs,
      };
    }

    if (!parsed.tracks || parsed.tracks.length === 0) {
      return { success: false, error: "No tracks suggested", responseTimeMs };
    }

    return {
      success: true,
      needsClarification: false,
      tracks: parsed.tracks,
      curatorNote: parsed.curatorNote,
      responseTimeMs,
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      responseTimeMs,
    };
  }
}
