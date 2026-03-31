// Refinement detection and interpretation
// Classifies user feedback and determines appropriate adjustments

import Anthropic from "@anthropic-ai/sdk";
import { RefinementResult, RefineInterpretationResult } from "./types";
import {
  REFINEMENT_DETECTOR_SYSTEM_PROMPT,
  REFINEMENT_USER_TEMPLATE,
} from "./prompts";

const anthropic = new Anthropic();

export async function detectRefinement(
  userMessage: string,
  currentVibe?: {
    genres: string[];
    energy: number;
    valence: number;
  }
): Promise<RefineInterpretationResult> {
  const startTime = Date.now();

  try {
    const userPrompt = REFINEMENT_USER_TEMPLATE(userMessage, currentVibe);

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: REFINEMENT_DETECTOR_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseTimeMs = Date.now() - startTime;

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return {
        success: false,
        error: "No text response from Claude",
        responseTimeMs,
      };
    }

    try {
      const refinement = JSON.parse(textContent.text) as RefinementResult;

      // Validate type field
      const validTypes = [
        "energy_up",
        "energy_down",
        "valence_up",
        "valence_down",
        "more_like_this",
        "exclude",
        "new_vibe",
      ];
      if (!validTypes.includes(refinement.type)) {
        return {
          success: false,
          error: `Invalid refinement type: ${refinement.type}`,
          responseTimeMs,
        };
      }

      return {
        success: true,
        refinement,
        responseTimeMs,
      };
    } catch {
      return {
        success: false,
        error: `Failed to parse refinement: ${textContent.text.substring(0, 100)}`,
        responseTimeMs,
      };
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      responseTimeMs,
    };
  }
}

// Apply refinement to existing vibe
export function applyRefinement(
  currentVibe: {
    genres: string[];
    energy: number;
    valence: number;
    exclusions: { genres: string[]; artists: string[] };
  },
  refinement: RefinementResult
): {
  genres: string[];
  energy: number;
  valence: number;
  exclusions: { genres: string[]; artists: string[] };
} {
  const result = { ...currentVibe };

  // Apply energy/valence adjustments
  if (refinement.adjustments) {
    if (refinement.adjustments.energyDelta) {
      result.energy = Math.max(
        0,
        Math.min(1, result.energy + refinement.adjustments.energyDelta)
      );
    }
    if (refinement.adjustments.valenceDelta) {
      result.valence = Math.max(
        0,
        Math.min(1, result.valence + refinement.adjustments.valenceDelta)
      );
    }
  }

  // Apply exclusions
  if (refinement.exclusions) {
    result.exclusions = {
      genres: [
        ...new Set([...result.exclusions.genres, ...refinement.exclusions.genres]),
      ],
      artists: [
        ...new Set([...result.exclusions.artists, ...refinement.exclusions.artists]),
      ],
    };
  }

  return result;
}
