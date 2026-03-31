// Voice DJ hook - manages DJ commentary playback
// Speaks track intros when tracks change

import { useCallback, useRef, useState, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";

interface VoiceDJState {
  isEnabled: boolean;
  isSpeaking: boolean;
  lastSpokenTrackId: string | null;
}

export function useVoiceDJ() {
  const [state, setState] = useState<VoiceDJState>({
    isEnabled: false,
    isSpeaking: false,
    lastSpokenTrackId: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { currentTrack } = usePlaybackStore();

  // Initialize audio element
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        setState((s) => ({ ...s, isSpeaking: false }));
      });
      audioRef.current.addEventListener("error", () => {
        setState((s) => ({ ...s, isSpeaking: false }));
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Speak when track changes
  useEffect(() => {
    if (!state.isEnabled || !currentTrack) return;
    if (currentTrack.id === state.lastSpokenTrackId) return;

    speakTrackIntro(currentTrack);
  }, [currentTrack?.id, state.isEnabled]);

  const speakTrackIntro = useCallback(async (track: NonNullable<typeof currentTrack>) => {
    if (!audioRef.current) return;

    setState((s) => ({ ...s, isSpeaking: true, lastSpokenTrackId: track.id }));

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackName: track.name,
          artistName: track.artists[0]?.name || "Unknown Artist",
          albumName: track.album.name,
          isFirst: !state.lastSpokenTrackId,
        }),
      });

      if (!response.ok) {
        console.warn("Voice synthesis unavailable");
        setState((s) => ({ ...s, isSpeaking: false }));
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current.src = audioUrl;
      audioRef.current.volume = 0.8;
      await audioRef.current.play();

      // Clean up blob URL after playing
      audioRef.current.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);
      }, { once: true });

    } catch (error) {
      console.error("Voice playback failed:", error);
      setState((s) => ({ ...s, isSpeaking: false }));
    }
  }, [state.lastSpokenTrackId]);

  const toggleEnabled = useCallback(() => {
    setState((s) => ({ ...s, isEnabled: !s.isEnabled }));
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState((s) => ({ ...s, isSpeaking: false }));
  }, []);

  return {
    isEnabled: state.isEnabled,
    isSpeaking: state.isSpeaking,
    toggleEnabled,
    stop,
  };
}
