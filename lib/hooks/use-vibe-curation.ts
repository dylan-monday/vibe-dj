// Vibe curation hook
// Orchestrates: message → interpretation → recommendations → playback

import { useCallback, useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import {
  getRecommendations,
  playTracks,
  addToQueue,
  searchTracks,
} from "@/lib/spotify";
import { loadTokens } from "@/lib/spotify/auth";
import { VibeInterpretation } from "@/lib/chat/types";
import { Track, QueueTrack } from "@/lib/spotify/types";
import { RefinementResult } from "@/lib/ai/types";

// Convert Track to QueueTrack format
function trackToQueueTrack(track: Track): QueueTrack {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists,
    album: track.album,
    durationMs: track.durationMs,
    addedAt: Date.now(),
  };
}

interface ClarificationQuestion {
  question: string;
  options?: string[];
}

interface CurationState {
  isProcessing: boolean;
  currentStep: "idle" | "interpreting" | "recommending" | "playing";
  error: string | null;
  pendingClarification: ClarificationQuestion | null;
}

interface CurationResult {
  success: boolean;
  tracks?: Track[];
  interpretation?: VibeInterpretation;
  needsClarification?: boolean;
  clarification?: ClarificationQuestion;
  error?: string;
}

export function useVibeCuration() {
  const [state, setState] = useState<CurationState>({
    isProcessing: false,
    currentStep: "idle",
    error: null,
    pendingClarification: null,
  });

  const { addMessage, addErrorMessage, setLoading } = useChatStore();
  const { getSessionContext, addVibe, addPlayedTracks, addExclusions } =
    useSessionStore();
  const { setUpcoming } = useQueueStore();

  // Helper to get active device ID (avoids circular deps)
  const getDeviceId = (): string | undefined =>
    usePlaybackStore.getState().activeDevice?.id ?? undefined;

  const processVibe = useCallback(
    async (userMessage: string): Promise<CurationResult> => {
      setState({
        isProcessing: true,
        currentStep: "interpreting",
        error: null,
        pendingClarification: null,
      });
      setLoading(true);

      try {
        setState((s) => ({ ...s, currentStep: "interpreting" }));

        const context = getSessionContext();

        // Step 1: Ask Claude to curate + validate tracks — all server-side to avoid
        // SDK retry-with-Retry-After hanging the browser for minutes
        const tokens = loadTokens();
        const curateResponse = await fetch("/api/curate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: userMessage,
            accessToken: tokens?.accessToken,
            context: {
              excludedGenres: context.excludedGenres,
              excludedArtists: context.excludedArtists,
            },
          }),
        });

        if (!curateResponse.ok) {
          throw new Error("Curation service unavailable");
        }

        const curateData = await curateResponse.json();

        // Handle clarification request
        if (curateData.needsClarification) {
          const clarification: ClarificationQuestion = {
            question: curateData.clarification.question,
            options: curateData.clarification.options,
          };

          addMessage({ role: "assistant", content: clarification.question });

          setState({
            isProcessing: false,
            currentStep: "idle",
            error: null,
            pendingClarification: clarification,
          });
          setLoading(false);

          return { success: true, needsClarification: true, clarification };
        }

        setState((s) => ({ ...s, currentStep: "recommending" }));

        // Server returns validated Track objects; fall back to keyword search if empty
        let tracks: Track[] = curateData.tracks || [];
        const curatorNote: string = curateData.curatorNote || "";

        if (tracks.length < 3) {
          const fallback = await searchTracks(userMessage, 10);
          const seenIds = new Set(tracks.map((t: Track) => t.id));
          tracks = [...tracks, ...fallback.filter((t) => !seenIds.has(t.id))];
        }

        if (tracks.length === 0) {
          throw new Error("No tracks found for that vibe. Try describing it differently.");
        }

        setState((s) => ({ ...s, currentStep: "playing" }));

        const trackIds = tracks.map((t) => t.id);
        await playTracks(trackIds, getDeviceId());
        addPlayedTracks(trackIds);

        // Update queue UI (skip first — it's now playing)
        setUpcoming(tracks.slice(1).map(trackToQueueTrack));

        const trackPreview = tracks
          .slice(0, 3)
          .map((t: Track) => `"${t.name}" by ${t.artists[0]?.name}`)
          .join(", ");

        const assistantMessage = curatorNote
          ? `${curatorNote} Starting with ${trackPreview}${tracks.length > 3 ? ` and ${tracks.length - 3} more.` : "."}`
          : `Starting with ${trackPreview}${tracks.length > 3 ? ` and ${tracks.length - 3} more.` : "."}`;

        addMessage({ role: "assistant", content: assistantMessage });

        setState({ isProcessing: false, currentStep: "idle", error: null, pendingClarification: null });
        setLoading(false);

        return { success: true, tracks };
      } catch (error) {
        console.error("[processVibe] Error:", error);
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
          pendingClarification: null,
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
      setUpcoming,
    ]
  );

  const processRefinement = useCallback(
    async (userMessage: string): Promise<CurationResult> => {
      setState({ isProcessing: true, currentStep: "interpreting", error: null, pendingClarification: null });
      setLoading(true);

      try {
        const context = getSessionContext();
        const latestVibe = context.previousVibes[context.previousVibes.length - 1];

        if (!latestVibe) {
          // No current vibe, treat as new vibe
          return processVibe(userMessage);
        }

        // Detect refinement type
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

        const { refinement } = (await refineResponse.json()) as {
          refinement: RefinementResult;
        };

        // If it's a new vibe request, delegate
        if (refinement.type === "new_vibe") {
          return processVibe(userMessage);
        }

        setState((s) => ({ ...s, currentStep: "recommending" }));

        // Build adjusted vibe
        const adjustedVibe: VibeInterpretation = {
          ...latestVibe,
          energy: Math.max(
            0,
            Math.min(1, latestVibe.energy + (refinement.adjustments?.energyDelta || 0))
          ),
          valence: Math.max(
            0,
            Math.min(1, latestVibe.valence + (refinement.adjustments?.valenceDelta || 0))
          ),
          exclusions: {
            genres: [
              ...latestVibe.exclusions.genres,
              ...(refinement.exclusions?.genres || []),
            ],
            artists: [
              ...latestVibe.exclusions.artists,
              ...(refinement.exclusions?.artists || []),
            ],
          },
        };

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
        await addToQueue(trackIds, getDeviceId());
        addPlayedTracks(trackIds);

        // Append to queue UI
        const currentUpcoming = useQueueStore.getState().upcomingTracks;
        setUpcoming([...currentUpcoming, ...tracks.map(trackToQueueTrack)]);

        // Store adjusted vibe
        addVibe(adjustedVibe);
        if (refinement.exclusions) {
          addExclusions(
            refinement.exclusions.genres || [],
            refinement.exclusions.artists || []
          );
        }

        // Generate response based on refinement type
        let responseMessage = "Adjusting the vibe...";
        if (refinement.type === "energy_up") {
          responseMessage = `Turning up the energy! Adding ${tracks.length} more intense tracks.`;
        } else if (refinement.type === "energy_down") {
          responseMessage = `Bringing it down a notch. Adding ${tracks.length} calmer tracks.`;
        } else if (refinement.type === "valence_up") {
          responseMessage = `Lifting the mood! Adding ${tracks.length} brighter tracks.`;
        } else if (refinement.type === "valence_down") {
          responseMessage = `Going darker. Adding ${tracks.length} moodier tracks.`;
        } else if (refinement.type === "exclude") {
          const excluded = [
            ...(refinement.exclusions?.genres || []),
            ...(refinement.exclusions?.artists || []),
          ].join(", ");
          responseMessage = `Got it, no more ${excluded}. Adding ${tracks.length} new tracks.`;
        } else if (refinement.type === "more_like_this") {
          responseMessage = `Finding more like that! Adding ${tracks.length} similar tracks.`;
        }

        addMessage({ role: "assistant", content: responseMessage });

        setState({ isProcessing: false, currentStep: "idle", error: null, pendingClarification: null });
        setLoading(false);

        return { success: true, tracks, interpretation: adjustedVibe };
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
          pendingClarification: null,
        });
        setLoading(false);
        return { success: false, error: errorMessage };
      }
    },
    [
      processVibe,
      addMessage,
      addErrorMessage,
      setLoading,
      getSessionContext,
      addVibe,
      addPlayedTracks,
      addExclusions,
      setUpcoming,
    ]
  );

  const processFeedback = useCallback(
    async (feedbackType: "more" | "less"): Promise<CurationResult> => {
      const { currentTrack } = usePlaybackStore.getState();

      if (!currentTrack) {
        return { success: false, error: "No track playing" };
      }

      const message =
        feedbackType === "more"
          ? "more like this"
          : `no more ${currentTrack.artists[0]?.name || "this artist"}`;

      return processRefinement(message);
    },
    [processRefinement]
  );

  return {
    processVibe,
    processRefinement,
    processFeedback,
    ...state,
  };
}
