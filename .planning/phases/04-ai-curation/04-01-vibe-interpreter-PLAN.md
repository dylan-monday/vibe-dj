---
phase: 4
plan: 1
title: Claude Vibe Interpreter
wave: 1
depends_on: []
files_modified:
  - lib/ai/vibe-interpreter.ts
  - lib/ai/prompts.ts
  - lib/ai/types.ts
  - lib/ai/index.ts
  - app/api/interpret/route.ts
requirements_addressed: [CURA-02]
autonomous: true
---

<objective>
Create Claude-powered vibe interpretation that parses natural language mood descriptions into structured Spotify parameters.

Purpose: Users say "cooking hard bop, no ballads" and we extract genres, energy, valence, tempo, and exclusions.
Output: Server-side API route that calls Claude and returns VibeInterpretation struct.
</objective>

<must_haves>
- Claude API call with structured JSON output
- Handles abstract descriptions ("Friday afternoon coding energy")
- Handles specific genres ("cooking hard bop")
- Handles exclusions ("no ballads", "no smooth jazz")
- Response time target < 3 seconds
- Server-side execution (API key stays secure)
- Error handling for API failures
</must_haves>

<task id="1">
<title>Create AI Module Types</title>
<action>
Create lib/ai/types.ts with interpretation-related types:

```typescript
// AI module types
// Re-exports VibeInterpretation from chat types for convenience

export { VibeInterpretation } from "@/lib/chat/types";

// Claude API response wrapper
export interface InterpretationResult {
  success: boolean;
  interpretation?: VibeInterpretation;
  error?: string;
  responseTimeMs: number;
}

// Session context for interpretation
export interface SessionContext {
  playedTrackIds: string[];
  excludedGenres: string[];
  excludedArtists: string[];
  previousVibes: VibeInterpretation[];
}
```
</action>
<acceptance_criteria>
- `lib/ai/types.ts` exists
- Re-exports VibeInterpretation
- Defines InterpretationResult and SessionContext
</acceptance_criteria>
</task>

<task id="2">
<title>Create System Prompt</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/chat/types.ts (VibeInterpretation structure)
</read_first>
<action>
Create lib/ai/prompts.ts with the system prompt for vibe interpretation:

```typescript
// Prompts for Claude vibe interpretation
// Intent parsing only - Claude should not claim music expertise

export const VIBE_INTERPRETER_SYSTEM_PROMPT = `You are a music mood interpreter. Your job is to translate natural language mood descriptions into structured parameters for a music recommendation system.

You will receive user messages describing the vibe, energy, or mood they want to hear. Extract these into structured parameters:

**genres**: Array of music genres. Be specific (e.g., "hard bop", "post-punk", "nu-disco") rather than vague ("jazz", "rock"). Maximum 5 genres.

**energy**: Number 0-1 where 0 is very calm/ambient and 1 is very energetic/intense.

**valence**: Number 0-1 where 0 is sad/melancholic and 1 is happy/upbeat.

**tempo** (optional): Object with min/max BPM if the user mentions tempo, pace, or speed. Only include if explicitly or strongly implied.

**instrumentalness** (optional): Number 0-1 if user mentions vocals preference. 0 = prefers vocals, 1 = prefers instrumental. Only include if relevant.

**exclusions**: Object with:
  - genres: Array of genres to exclude (e.g., "smooth jazz", "r&b", "ballads")
  - artists: Array of specific artists to exclude

**seedArtists** (optional): If user mentions specific artists as examples, include their names here.

**seedTracks** (optional): If user mentions specific songs as examples, include them here.

Rules:
1. Always provide genres, energy, valence, and exclusions (even if empty arrays).
2. Parse abstract descriptions creatively ("Friday afternoon coding energy" → moderate energy, focused, likely electronic or ambient).
3. "No X" or "without X" → add to exclusions.
4. If unsure about a parameter, make a reasonable inference based on the described mood.
5. Do NOT hallucinate specific track or artist names unless the user mentioned them.
6. Keep responses concise - output JSON only, no explanations.

Respond ONLY with valid JSON matching this exact structure:
{
  "genres": ["string"],
  "energy": 0.0,
  "valence": 0.0,
  "tempo": { "min": 0, "max": 0 } | null,
  "instrumentalness": 0.0 | null,
  "exclusions": {
    "genres": ["string"],
    "artists": ["string"]
  },
  "seedArtists": ["string"] | null,
  "seedTracks": ["string"] | null
}`;

export const VIBE_INTERPRETER_USER_TEMPLATE = (
  userMessage: string,
  context?: { excludedGenres?: string[]; excludedArtists?: string[] }
) => {
  let prompt = userMessage;

  if (context?.excludedGenres?.length || context?.excludedArtists?.length) {
    prompt += "\n\n[Session context - already excluded: ";
    if (context.excludedGenres?.length) {
      prompt += \`genres: \${context.excludedGenres.join(", ")}. \`;
    }
    if (context.excludedArtists?.length) {
      prompt += \`artists: \${context.excludedArtists.join(", ")}.\`;
    }
    prompt += "]";
  }

  return prompt;
};
```
</action>
<acceptance_criteria>
- `lib/ai/prompts.ts` exists
- System prompt instructs JSON-only output
- Handles abstract and specific descriptions
- Template function incorporates session context
</acceptance_criteria>
</task>

<task id="3">
<title>Create Vibe Interpreter Function</title>
<action>
Create lib/ai/vibe-interpreter.ts:

```typescript
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
    } catch (parseError) {
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
```
</action>
<acceptance_criteria>
- `lib/ai/vibe-interpreter.ts` exists
- Uses Claude claude-sonnet-4-20250514 model
- Returns InterpretationResult with timing
- Validates required fields in response
- Merges session exclusions
- Handles API and parse errors
</acceptance_criteria>
</task>

<task id="4">
<title>Create AI Module Barrel Export</title>
<action>
Create lib/ai/index.ts:

```typescript
export { interpretVibe } from "./vibe-interpreter";
export type {
  InterpretationResult,
  SessionContext,
  VibeInterpretation,
} from "./types";
```
</action>
<acceptance_criteria>
- `lib/ai/index.ts` exists
- Exports interpretVibe function
- Exports all types
</acceptance_criteria>
</task>

<task id="5">
<title>Create Interpret API Route</title>
<action>
Create app/api/interpret/route.ts:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { interpretVibe } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await interpretVibe(message, context);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, responseTimeMs: result.responseTimeMs },
        { status: 500 }
      );
    }

    return NextResponse.json({
      interpretation: result.interpretation,
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
- `app/api/interpret/route.ts` exists
- POST endpoint accepts message and optional context
- Returns interpretation or error with status codes
- API key not exposed to client
</acceptance_criteria>
</task>

<verification>
Run these commands to verify the vibe interpreter is complete:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. Files exist
ls -la lib/ai/
ls -la app/api/interpret/

# 4. Test API (requires ANTHROPIC_API_KEY in .env)
# Manual test via curl or dev server
```
</verification>
