---
phase: 4
plan: 4
title: Curation Integration
wave: 2
depends_on: [04-01-vibe-interpreter, 04-02-spotify-recommendations, 04-03-session-memory]
files_modified:
  - lib/hooks/use-vibe-curation.ts
  - lib/hooks/index.ts
  - lib/spotify/playback.ts
  - components/chat/chat-panel.tsx
requirements_addressed: [CURA-02, CURA-03, CURA-04]
autonomous: true
---

<objective>
Create the curation hook that orchestrates vibe interpretation, recommendations, and playback.

Purpose: Single hook that handles user message → AI interpretation → Spotify recommendations → playback start.
Output: useVibeCuration hook and updated ChatPanel that plays music from vibe descriptions.
</objective>

<must_haves>
- Orchestrate: interpret → recommend → play
- Handle loading states
- Handle errors with retry
- Update session memory throughout
- Generate natural assistant responses
- Play tracks immediately after getting recommendations
- Response time < 5 seconds total
</must_haves>

<task id="1">
<title>Add Play Tracks Function to Playback API</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/playback.ts
</read_first>
<action>
Add a function to play specific track URIs to lib/spotify/playback.ts:

```typescript
// Play specific tracks (adds to queue and starts playback)
export async function playTracks(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  if (trackIds.length === 0) {
    throw new SpotifyApiError("No tracks to play", 400);
  }

  // Convert IDs to URIs
  const uris = trackIds.map((id) => `spotify:track:${id}`);

  return withErrorHandling(async () => {
    // Start playback with the track URIs
    await client.player.startResumePlayback("", undefined, uris);
  });
}

// Add tracks to queue (after currently playing track)
export async function addToQueue(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Add each track to queue sequentially
    for (const trackId of trackIds) {
      const uri = `spotify:track:${trackId}`;
      await client.player.addItemToPlaybackQueue(uri);
    }
  });
}
```
</action>
<acceptance_criteria>
- playTracks function added to playback.ts
- addToQueue function added to playback.ts
- Both use withErrorHandling
- Convert track IDs to URIs correctly
</acceptance_criteria>
</task>

<task id="2">
<title>Create Vibe Curation Hook</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/hooks/use-playback-polling.ts (for hook pattern)
</read_first>
<action>
Create lib/hooks/use-vibe-curation.ts:

```typescript
// Vibe curation hook
// Orchestrates: message → interpretation → recommendations → playback

import { useCallback, useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { getRecommendations, playTracks } from "@/lib/spotify";
import { VibeInterpretation, Track } from "@/lib/chat/types";

interface CurationState {
  isProcessing: boolean;
  currentStep: "idle" | "interpreting" | "recommending" | "playing";
  error: string | null;
}

interface CurationResult {
  success: boolean;
  tracks?: Track[];
  interpretation?: VibeInterpretation;
  error?: string;
}

export function useVibeCuration() {
  const [state, setState] = useState<CurationState>({
    isProcessing: false,
    currentStep: "idle",
    error: null,
  });

  const { addMessage, addErrorMessage, setLoading } = useChatStore();
  const {
    getSessionContext,
    addVibe,
    addPlayedTracks,
    addExclusions,
  } = useSessionStore();
  const { refreshPlayback } = usePlaybackStore();

  const processVibe = useCallback(
    async (userMessage: string): Promise<CurationResult> => {
      setState({ isProcessing: true, currentStep: "interpreting", error: null });
      setLoading(true);

      try {
        // Step 1: Interpret the vibe via API
        setState((s) => ({ ...s, currentStep: "interpreting" }));

        const context = getSessionContext();
        const interpretResponse = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            context: {
              excludedGenres: context.excludedGenres,
              excludedArtists: context.excludedArtists,
            },
          }),
        });

        if (!interpretResponse.ok) {
          const errorData = await interpretResponse.json();
          throw new Error(errorData.error || "Failed to interpret vibe");
        }

        const { interpretation } = await interpretResponse.json();

        // Store the vibe and exclusions
        addVibe(interpretation);
        if (interpretation.exclusions) {
          addExclusions(
            interpretation.exclusions.genres || [],
            interpretation.exclusions.artists || []
          );
        }

        // Step 2: Get recommendations
        setState((s) => ({ ...s, currentStep: "recommending" }));

        const { tracks } = await getRecommendations(interpretation, {
          limit: 15,
          playedTrackIds: context.playedTrackIds,
        });

        if (tracks.length === 0) {
          throw new Error(
            "No tracks found matching that vibe. Try being more specific or different genres."
          );
        }

        // Step 3: Play the tracks
        setState((s) => ({ ...s, currentStep: "playing" }));

        const trackIds = tracks.map((t) => t.id);
        await playTracks(trackIds);

        // Update session with played tracks
        addPlayedTracks(trackIds);

        // Refresh playback state to show new track
        setTimeout(() => refreshPlayback(), 500);

        // Generate assistant response
        const genres = interpretation.genres.slice(0, 3).join(", ");
        const trackPreview = tracks
          .slice(0, 3)
          .map((t) => `"${t.name}" by ${t.artists[0]?.name}`)
          .join(", ");

        const assistantMessage =
          `Got it! Setting the vibe with ${genres}. Starting with ${trackPreview}` +
          (tracks.length > 3 ? ` and ${tracks.length - 3} more tracks.` : ".");

        addMessage({ role: "assistant", content: assistantMessage });

        setState({ isProcessing: false, currentStep: "idle", error: null });
        setLoading(false);

        return { success: true, tracks, interpretation };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Something went wrong";

        addErrorMessage({
          content: errorMessage,
          retryable: true,
          originalPrompt: userMessage,
        });

        setState({ isProcessing: false, currentStep: "idle", error: errorMessage });
        setLoading(false);

        return { success: false, error: errorMessage };
      }
    },
    [
      addMessage,
      addErrorMessage,
      setLoading,
      getSessionContext,
      addVibe,
      addPlayedTracks,
      addExclusions,
      refreshPlayback,
    ]
  );

  return {
    processVibe,
    ...state,
  };
}
```
</action>
<acceptance_criteria>
- `lib/hooks/use-vibe-curation.ts` exists
- Calls /api/interpret for Claude interpretation
- Calls getRecommendations for Spotify tracks
- Calls playTracks to start playback
- Updates session memory with played tracks
- Generates natural assistant response
- Handles errors with retry capability
- Tracks processing state and current step
</acceptance_criteria>
</task>

<task id="3">
<title>Update Hooks Index</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/hooks/index.ts
</read_first>
<action>
Update lib/hooks/index.ts to export the new hook:

Add this export:
```typescript
export { useVibeCuration } from "./use-vibe-curation";
```
</action>
<acceptance_criteria>
- lib/hooks/index.ts exports useVibeCuration
</acceptance_criteria>
</task>

<task id="4">
<title>Update ChatPanel to Use Curation Hook</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/components/chat/chat-panel.tsx
</read_first>
<action>
Update components/chat/chat-panel.tsx to use the real curation hook:

Replace the placeholder handleSubmit with the real curation flow:

```typescript
"use client";

import { useEffect, useRef } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useVibeCuration } from "@/lib/hooks/use-vibe-curation";
import { ChatMessage } from "./chat-message";
import { ChatInput } from "./chat-input";

export function ChatPanel() {
  const { messages, isLoading, currentError, addMessage, retryLastMessage } =
    useChatStore();
  const { processVibe, currentStep } = useVibeCuration();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSubmit = async (content: string) => {
    // Add user message
    addMessage({ role: "user", content });

    // Process the vibe (interpret → recommend → play)
    await processVibe(content);
  };

  const handleRetry = async () => {
    const prompt = retryLastMessage();
    if (prompt) {
      await processVibe(prompt);
    }
  };

  // Get step-specific loading message
  const getLoadingMessage = () => {
    switch (currentStep) {
      case "interpreting":
        return "Understanding your vibe...";
      case "recommending":
        return "Finding the perfect tracks...";
      case "playing":
        return "Starting playback...";
      default:
        return "Thinking...";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
            <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Describe your vibe
            </h3>
            <p className="text-sm text-foreground/60 max-w-xs">
              Try &quot;cooking hard bop, no ballads&quot; or &quot;Friday afternoon coding
              energy&quot;
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onRetry={
                  message.role === "error" && currentError?.id === message.id
                    ? handleRetry
                    : undefined
                }
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center gap-2 px-4 py-2 text-foreground/60">
          <div className="flex gap-1">
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-sm">{getLoadingMessage()}</span>
        </div>
      )}

      {/* Input area */}
      <ChatInput onSubmit={handleSubmit} isLoading={isLoading} />
    </div>
  );
}
```
</action>
<acceptance_criteria>
- ChatPanel imports useVibeCuration
- handleSubmit calls processVibe instead of placeholder
- handleRetry calls processVibe
- Loading message reflects current step
- No more placeholder "Phase 4 coming" message
</acceptance_criteria>
</task>

<task id="5">
<title>Update Spotify Index for New Functions</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/index.ts
</read_first>
<action>
Update lib/spotify/index.ts to export playTracks and addToQueue:

Add these exports:
```typescript
export { playTracks, addToQueue } from "./playback";
```
</action>
<acceptance_criteria>
- lib/spotify/index.ts exports playTracks
- lib/spotify/index.ts exports addToQueue
</acceptance_criteria>
</task>

<verification>
Run these commands to verify curation integration is complete:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. Files exist
ls -la lib/hooks/use-vibe-curation.ts

# 4. Dev server test (manual)
npm run dev
# Visit http://localhost:3000
# Log in to Spotify, select device
# Type "cooking hard bop" in chat
# Should see tracks start playing
```
</verification>
