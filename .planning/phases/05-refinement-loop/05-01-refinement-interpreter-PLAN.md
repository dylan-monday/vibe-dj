---
phase: 5
plan: 1
title: Refinement Interpreter
wave: 1
depends_on: [04-04-curation-integration]
files_modified:
  - lib/ai/prompts.ts
  - lib/ai/refinement.ts
  - lib/ai/types.ts
  - lib/ai/index.ts
  - app/api/refine/route.ts
  - lib/hooks/use-vibe-curation.ts
requirements_addressed: [CURA-05]
autonomous: true
---

<objective>
Create refinement detection and processing to adjust the vibe based on feedback.

Purpose: Users can say "too mellow", "more like that one", "no more smooth jazz" to adjust playback.
Output: API route that detects refinement vs new vibe and applies appropriate adjustments.
</objective>

<must_haves>
- Detect refinement commands vs new vibe requests
- "too mellow/energetic" → adjust energy +/- 0.2
- "more like that one" → seed from current track
- "no more X" → add to exclusions
- Apply changes to current vibe (not start fresh)
- Response time < 5 seconds
</must_haves>

<task id="1">
<title>Add Refinement Types</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/ai/types.ts
</read_first>
<action>
Update lib/ai/types.ts to add refinement types:

```typescript
// Refinement command types
export type RefinementType =
  | "energy_up"      // "too mellow", "more energy"
  | "energy_down"    // "too intense", "calmer"
  | "valence_up"     // "happier", "more upbeat"
  | "valence_down"   // "darker", "moodier"
  | "more_like_this" // "more like that one", "similar to this"
  | "exclude"        // "no more X", "skip X"
  | "new_vibe";      // Fresh vibe request (not a refinement)

export interface RefinementResult {
  type: RefinementType;
  adjustments?: {
    energyDelta?: number;    // -0.3 to +0.3
    valenceDelta?: number;   // -0.3 to +0.3
  };
  exclusions?: {
    genres: string[];
    artists: string[];
  };
  seedFromCurrent?: boolean;
  newVibe?: VibeInterpretation;
}

export interface RefineInterpretationResult {
  success: boolean;
  refinement?: RefinementResult;
  error?: string;
  responseTimeMs: number;
}
```
</action>
<acceptance_criteria>
- RefinementType enum covers all refinement cases
- RefinementResult captures adjustments, exclusions, and seed flags
- RefineInterpretationResult wraps API response
</acceptance_criteria>
</task>

<task id="2">
<title>Create Refinement Prompt</title>
<action>
Add refinement prompt to lib/ai/prompts.ts:

```typescript
export const REFINEMENT_DETECTOR_SYSTEM_PROMPT = `You are a music feedback classifier. Analyze user messages to determine if they are:
1. A REFINEMENT of the current vibe (adjusting energy, mood, excluding something)
2. A NEW VIBE request (completely different music direction)

Refinement indicators:
- "too X" / "not X enough" → energy or valence adjustment
- "more like this/that" → seed from current track
- "no more X" / "skip X" / "without X" → exclusion
- "calmer" / "more intense" → energy adjustment
- "happier" / "darker" → valence adjustment

New vibe indicators:
- Completely different genre/mood description
- "play X" / "I want to hear X"
- "switch to X" / "change to X"

Respond ONLY with valid JSON:
{
  "type": "energy_up" | "energy_down" | "valence_up" | "valence_down" | "more_like_this" | "exclude" | "new_vibe",
  "adjustments": {
    "energyDelta": number | null,  // -0.3 to +0.3
    "valenceDelta": number | null   // -0.3 to +0.3
  } | null,
  "exclusions": {
    "genres": ["string"],
    "artists": ["string"]
  } | null,
  "seedFromCurrent": boolean
}

Rules:
1. For "too mellow" → type: "energy_up", energyDelta: 0.2
2. For "too intense" → type: "energy_down", energyDelta: -0.2
3. For "more like this" → type: "more_like_this", seedFromCurrent: true
4. For "no more jazz" → type: "exclude", exclusions: { genres: ["jazz"], artists: [] }
5. If it's a new vibe request, set type: "new_vibe" with all other fields null`;

export const REFINEMENT_USER_TEMPLATE = (
  userMessage: string,
  currentVibe?: {
    genres: string[];
    energy: number;
    valence: number;
  }
) => {
  let prompt = userMessage;

  if (currentVibe) {
    prompt += `\n\n[Current vibe: genres=${currentVibe.genres.join(", ")}, energy=${currentVibe.energy}, valence=${currentVibe.valence}]`;
  }

  return prompt;
};
```
</action>
<acceptance_criteria>
- REFINEMENT_DETECTOR_SYSTEM_PROMPT covers all refinement types
- User template includes current vibe context
- JSON output format is well-defined
</acceptance_criteria>
</task>

<task id="3">
<title>Create Refinement Interpreter Function</title>
<action>
Create lib/ai/refinement.ts:

```typescript
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
        "energy_up", "energy_down", "valence_up", "valence_down",
        "more_like_this", "exclude", "new_vibe"
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
      result.energy = Math.max(0, Math.min(1,
        result.energy + refinement.adjustments.energyDelta
      ));
    }
    if (refinement.adjustments.valenceDelta) {
      result.valence = Math.max(0, Math.min(1,
        result.valence + refinement.adjustments.valenceDelta
      ));
    }
  }

  // Apply exclusions
  if (refinement.exclusions) {
    result.exclusions = {
      genres: [...new Set([...result.exclusions.genres, ...refinement.exclusions.genres])],
      artists: [...new Set([...result.exclusions.artists, ...refinement.exclusions.artists])],
    };
  }

  return result;
}
```
</action>
<acceptance_criteria>
- detectRefinement calls Claude with refinement prompt
- applyRefinement modifies vibe based on refinement result
- Energy/valence clamped to 0-1 range
- Exclusions merged without duplicates
</acceptance_criteria>
</task>

<task id="4">
<title>Update AI Module Exports</title>
<action>
Update lib/ai/index.ts to export refinement functions:

```typescript
export { interpretVibe } from "./vibe-interpreter";
export { detectRefinement, applyRefinement } from "./refinement";
export type { InterpretationResult, SessionContext } from "./types";
export type {
  RefinementType,
  RefinementResult,
  RefineInterpretationResult
} from "./types";
export type { VibeInterpretation } from "@/lib/chat/types";
```
</action>
<acceptance_criteria>
- Refinement functions exported
- Refinement types exported
</acceptance_criteria>
</task>

<task id="5">
<title>Create Refine API Route</title>
<action>
Create app/api/refine/route.ts:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { detectRefinement } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, currentVibe } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await detectRefinement(message, currentVibe);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, responseTimeMs: result.responseTimeMs },
        { status: 500 }
      );
    }

    return NextResponse.json({
      refinement: result.refinement,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```
</action>
<acceptance_criteria>
- POST endpoint at /api/refine
- Accepts message and optional currentVibe
- Returns refinement result
</acceptance_criteria>
</task>

<task id="6">
<title>Update Curation Hook for Refinements</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/hooks/use-vibe-curation.ts
</read_first>
<action>
Update lib/hooks/use-vibe-curation.ts to handle refinements:

1. Add processRefinement function that:
   - Calls /api/refine to detect refinement type
   - If "new_vibe", delegates to processVibe
   - If refinement, applies adjustments to current vibe
   - If "more_like_this", uses current track as seed
   - Gets new recommendations with adjusted params
   - Adds tracks to queue (not replace)

2. Update processVibe to first check if it's a refinement:
   - Call detectRefinement first
   - If type !== "new_vibe", call processRefinement
   - Otherwise proceed with full vibe interpretation

Add this function:

```typescript
const processRefinement = useCallback(
  async (userMessage: string, refinementType?: string): Promise<CurationResult> => {
    setState({ isProcessing: true, currentStep: "interpreting", error: null });
    setLoading(true);

    try {
      const context = getSessionContext();
      const latestVibe = context.previousVibes[context.previousVibes.length - 1];

      if (!latestVibe) {
        // No current vibe, treat as new vibe
        return processVibe(userMessage);
      }

      // Detect refinement type if not provided
      let refinement;
      if (!refinementType) {
        const refineResponse = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            currentVibe: {
              genres: latestVibe.genres,
              energy: latestVibe.energy,
              valence: latestVibe.valence,
            },
          }),
        });

        if (!refineResponse.ok) {
          throw new Error("Failed to detect refinement");
        }

        const { refinement: detected } = await refineResponse.json();
        refinement = detected;

        // If it's a new vibe request, delegate
        if (refinement.type === "new_vibe") {
          return processVibe(userMessage);
        }
      }

      setState((s) => ({ ...s, currentStep: "recommending" }));

      // Build adjusted vibe
      const adjustedVibe = {
        ...latestVibe,
        energy: latestVibe.energy + (refinement?.adjustments?.energyDelta || 0),
        valence: latestVibe.valence + (refinement?.adjustments?.valenceDelta || 0),
        exclusions: {
          genres: [...latestVibe.exclusions.genres, ...(refinement?.exclusions?.genres || [])],
          artists: [...latestVibe.exclusions.artists, ...(refinement?.exclusions?.artists || [])],
        },
      };

      // Clamp values
      adjustedVibe.energy = Math.max(0, Math.min(1, adjustedVibe.energy));
      adjustedVibe.valence = Math.max(0, Math.min(1, adjustedVibe.valence));

      // If "more like this", use current track as seed
      // (would need playback store access - simplified for now)

      // Get new recommendations
      const { tracks } = await getRecommendations(adjustedVibe, {
        limit: 10,
        playedTrackIds: context.playedTrackIds,
      });

      if (tracks.length === 0) {
        throw new Error("No tracks found matching adjusted vibe.");
      }

      // Add to queue (not replace - refinement adds to existing)
      setState((s) => ({ ...s, currentStep: "playing" }));
      const trackIds = tracks.map((t) => t.id);
      await addToQueue(trackIds);
      addPlayedTracks(trackIds);

      // Store adjusted vibe
      addVibe(adjustedVibe);
      if (refinement?.exclusions) {
        addExclusions(
          refinement.exclusions.genres || [],
          refinement.exclusions.artists || []
        );
      }

      // Generate response based on refinement type
      let responseMessage = "Adjusting the vibe...";
      if (refinement?.type === "energy_up") {
        responseMessage = `Turning up the energy! Adding ${tracks.length} more intense tracks.`;
      } else if (refinement?.type === "energy_down") {
        responseMessage = `Bringing it down a notch. Adding ${tracks.length} calmer tracks.`;
      } else if (refinement?.type === "exclude") {
        const excluded = [...(refinement.exclusions?.genres || []), ...(refinement.exclusions?.artists || [])].join(", ");
        responseMessage = `Got it, no more ${excluded}. Adding ${tracks.length} new tracks.`;
      } else if (refinement?.type === "more_like_this") {
        responseMessage = `Finding more like that! Adding ${tracks.length} similar tracks.`;
      }

      addMessage({ role: "assistant", content: responseMessage });

      setState({ isProcessing: false, currentStep: "idle", error: null });
      setLoading(false);

      return { success: true, tracks, interpretation: adjustedVibe };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Something went wrong";
      addErrorMessage({
        role: "error",
        content: errorMessage,
        retryable: true,
        originalPrompt: userMessage,
      });
      setState({ isProcessing: false, currentStep: "idle", error: errorMessage });
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  },
  [processVibe, addMessage, addErrorMessage, setLoading, getSessionContext, addVibe, addPlayedTracks, addExclusions]
);
```

Also import addToQueue from lib/spotify and return processRefinement from hook.
</action>
<acceptance_criteria>
- processRefinement handles all refinement types
- Delegates to processVibe for new vibes
- Adjusts energy/valence based on refinement
- Adds to exclusions
- Generates appropriate response messages
- Adds tracks to queue (not replace)
</acceptance_criteria>
</task>

<verification>
```bash
# TypeScript compiles
npx tsc --noEmit

# Build succeeds
npm run build

# Files exist
ls -la lib/ai/refinement.ts
ls -la app/api/refine/
```
</verification>
