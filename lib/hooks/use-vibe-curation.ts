// Vibe curation hook
// Orchestrates: message → interpretation → recommendations → playback

import { useCallback, useState } from "react";
import { useChatStore } from "@/lib/stores/chat-store";
import { useSessionStore } from "@/lib/stores/session-store";
import {
  getRecommendations,
  playTracks,
  addToQueue,
  searchTracks,
} from "@/lib/spotify";
import { VibeInterpretation } from "@/lib/chat/types";
import { Track } from "@/lib/spotify/types";
import { RefinementResult } from "@/lib/ai/types";

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
          await playTracks(trackIds);
          addPlayedTracks(trackIds);

          const trackPreview = searchResults
            .slice(0, 3)
            .map((t) => `"${t.name}" by ${t.artists[0]?.name}`)
            .join(", ");

          addMessage({
            role: "assistant",
            content: `Searching for "${userMessage}"... Found ${trackPreview}${searchResults.length > 3 ? ` and ${searchResults.length - 3} more.` : "."}`,
          });

          setState({ isProcessing: false, currentStep: "idle", error: null });
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

        // Step 2: Get recommendations
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

  const processRefinement = useCallback(
    async (userMessage: string): Promise<CurationResult> => {
      setState({ isProcessing: true, currentStep: "interpreting", error: null });
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
        await addToQueue(trackIds);
        addPlayedTracks(trackIds);

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

        setState({ isProcessing: false, currentStep: "idle", error: null });
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
    ]
  );

  return {
    processVibe,
    processRefinement,
    ...state,
  };
}
