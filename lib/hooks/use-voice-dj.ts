// Voice DJ hook - on-demand DJ commentary
// Click to hear info about the current track

import { useCallback, useRef, useState, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";

interface VoiceDJState {
  isSpeaking: boolean;
  isLoading: boolean;
}

export function useVoiceDJ() {
  const [state, setState] = useState<VoiceDJState>({
    isSpeaking: false,
    isLoading: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { currentTrack } = usePlaybackStore();

  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener("ended", () => {
        setState({ isSpeaking: false, isLoading: false });
      });
      audioRef.current.addEventListener("error", () => {
        setState({ isSpeaking: false, isLoading: false });
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const speak = useCallback(async () => {
    if (!audioRef.current || !currentTrack) return;

    // If already speaking, stop
    if (state.isSpeaking) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState({ isSpeaking: false, isLoading: false });
      return;
    }

    setState({ isSpeaking: false, isLoading: true });

    try {
      const response = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackName: currentTrack.name,
          artistName: currentTrack.artists[0]?.name || "Unknown Artist",
          albumName: currentTrack.album.name,
          isFirst: false,
        }),
      });

      if (!response.ok) {
        console.warn("Voice synthesis unavailable");
        setState({ isSpeaking: false, isLoading: false });
        return;
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      audioRef.current.src = audioUrl;
      audioRef.current.volume = 0.8;
      await audioRef.current.play();
      setState({ isSpeaking: true, isLoading: false });

      audioRef.current.addEventListener("ended", () => {
        URL.revokeObjectURL(audioUrl);
      }, { once: true });

    } catch (error) {
      console.error("Voice playback failed:", error);
      setState({ isSpeaking: false, isLoading: false });
    }
  }, [currentTrack, state.isSpeaking]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState({ isSpeaking: false, isLoading: false });
  }, []);

  return {
    isSpeaking: state.isSpeaking,
    isLoading: state.isLoading,
    hasTrack: !!currentTrack,
    speak,
    stop,
  };
}
