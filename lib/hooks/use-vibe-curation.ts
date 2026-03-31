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
        let interpretation: VibeInterpretation;
        let interpretationFailed = false;

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
          // Interpretation failed - use default vibe and search directly
          interpretationFailed = true;
          interpretation = {
            genres: ["pop"],
            energy: 0.5,
            valence: 0.5,
            tempo: { min: 100, max: 140 },
            instrumentalness: 0.2,
            exclusions: { genres: [], artists: [] },
            seedArtists: [],
            seedTracks: [],
          };
        } else {
          const data = await interpretResponse.json();

          // Check if Claude is asking for clarification
          if (data.needsClarification) {
            const clarification: ClarificationQuestion = {
              question: data.clarification.question,
              options: data.clarification.options,
            };

            // Show clarifying question to user
            addMessage({
              role: "assistant",
              content: clarification.question,
            });

            setState({
              isProcessing: false,
              currentStep: "idle",
              error: null,
              pendingClarification: clarification,
            });
            setLoading(false);

            return {
              success: true,
              needsClarification: true,
              clarification,
            };
          }

          interpretation = data.interpretation;
        }

        // If interpretation failed, go straight to search
        if (interpretationFailed) {
          setState((s) => ({ ...s, currentStep: "recommending" }));
          const searchResults = await searchTracks(userMessage, 10);

          if (searchResults.length === 0) {
            throw new Error("Couldn't find any tracks. Try a different search.");
          }

          // Play search results
          setState((s) => ({ ...s, currentStep: "playing" }));
          const trackIds = searchResults.map((t) => t.id);
          await playTracks(trackIds, getDeviceId());
          addPlayedTracks(trackIds);

          // Update queue UI (skip first track since it's now playing)
          setUpcoming(searchResults.slice(1).map(trackToQueueTrack));

          const trackPreview = searchResults
            .slice(0, 3)
            .map((t) => `"${t.name}" by ${t.artists[0]?.name}`)
            .join(", ");

          addMessage({
            role: "assistant",
            content: `Searching for "${userMessage}"... Found ${trackPreview}${searchResults.length > 3 ? ` and ${searchResults.length - 3} more.` : "."}`,
          });

          setState({ isProcessing: false, currentStep: "idle", error: null, pendingClarification: null });
          setLoading(false);
          return { success: true, tracks: searchResults };
        }

        // Store the vibe and exclusions
        addVibe(interpretation);
        if (interpretation.exclusions) {
          addExclusions(
            interpretation.exclusions.genres || [],
            interpretation.exclusions.artists || []
          );
        }

        setState((s) => ({ ...s, currentStep: "recommending" }));

        const { tracks: recommendedTracks } = await getRecommendations(
          interpretation,
          {
            limit: 15,
            playedTrackIds: context.playedTrackIds,
          }
        );

        let tracks = recommendedTracks;
        let usedFallback = false;

        // If no recommendations, try search fallback
        if (tracks.length === 0) {
          const searchTerms = [
            ...interpretation.genres.slice(0, 2),
            interpretation.energy > 0.7
              ? "energetic"
              : interpretation.energy < 0.3
                ? "calm"
                : "",
          ]
            .filter(Boolean)
            .join(" ");

          const searchResults = await searchTracks(
            searchTerms || userMessage,
            10
          );

          if (searchResults.length === 0) {
            throw new Error(
              "No tracks found matching that vibe. Try being more specific or different genres."
            );
          }

          tracks = searchResults;
          usedFallback = true;
        }

        setState((s) => ({ ...s, currentStep: "playing" }));

        const trackIds = tracks.map((t) => t.id);
        await playTracks(trackIds, getDeviceId());

        // Update session with played tracks
        addPlayedTracks(trackIds);

        // Update queue UI (skip first track since it's now playing)
        setUpcoming(tracks.slice(1).map(trackToQueueTrack));

        // Generate assistant response
        const genres = interpretation.genres.slice(0, 3).join(", ");
        const trackPreview = tracks
          .slice(0, 3)
          .map((t: Track) => `"${t.name}" by ${t.artists[0]?.name}`)
          .join(", ");

        let assistantMessage: string;
        if (usedFallback) {
          assistantMessage =
            `I couldn't find perfect matches, but here's what I found: ${trackPreview}` +
            (tracks.length > 3 ? ` and ${tracks.length - 3} more tracks.` : ".");
        } else {
          assistantMessage =
            `Got it! Setting the vibe with ${genres}. Starting with ${trackPreview}` +
            (tracks.length > 3 ? ` and ${tracks.length - 3} more tracks.` : ".");
        }

        addMessage({ role: "assistant", content: assistantMessage });

        setState({ isProcessing: false, currentStep: "idle", error: null, pendingClarification: null });
        setLoading(false);

        return { success: true, tracks, interpretation };
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
