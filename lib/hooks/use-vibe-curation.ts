// Vibe curation hook
// Orchestrates: message → interpretation → recommendations → playback

import { useCallback, useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { getRecommendations, playTracks } from "@/lib/spotify";
import { VibeInterpretation } from "@/lib/chat/types";
import { Track } from "@/lib/spotify/types";

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
  const { getSessionContext, addVibe, addPlayedTracks, addExclusions } =
    useSessionStore();

  const processVibe = useCallback(
    async (userMessage: string): Promise<CurationResult> => {
      setState({
        isProcessing: true,
        currentStep: "interpreting",
        error: null,
      });
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

        // Playback state will update via polling within 3 seconds

        // Generate assistant response
        const genres = interpretation.genres.slice(0, 3).join(", ");
        const trackPreview = tracks
          .slice(0, 3)
          .map((t: Track) => `"${t.name}" by ${t.artists[0]?.name}`)
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
          role: "error",
          content: errorMessage,
          retryable: true,
          originalPrompt: userMessage,
        });

        setState({
          isProcessing: false,
          currentStep: "idle",
          error: errorMessage,
        });
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
    ]
  );

  return {
    processVibe,
    ...state,
  };
}
