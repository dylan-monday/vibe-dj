// Claude-powered vibe interpretation
// Parses natural language into VibeInterpretation structure

import Anthropic from "@anthropic-ai/sdk";
import { VibeInterpretation } from "@/lib/chat/types";
import { InterpretationResult, SessionContext } from "./types";
import {
  VIBE_INTERPRETER_SYSTEM_PROMPT,
  VIBE_INTERPRETER_USER_TEMPLATE,
} from "./prompts";

// Initialize Anthropic client (server-side only)
const anthropic = new Anthropic();

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
      const interpretation = JSON.parse(textContent.text) as VibeInterpretation;

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
