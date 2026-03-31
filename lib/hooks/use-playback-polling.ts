// Hook to poll Spotify playback state
// Handles Page Visibility API, exponential backoff, and history tracking

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import { getPlaybackState } from "@/lib/spotify/playback";

const ACTIVE_POLL_INTERVAL = 5000; // 5 seconds when playing
const PAUSED_POLL_INTERVAL = 15000; // 15 seconds when paused
const MAX_BACKOFF = 60000; // Max 60 seconds

export function usePlaybackPolling() {
  const { isAuthenticated } = useAuthStore();
  const {
    updatePlaybackState,
    isPlaying,
    currentTrack,
    startPolling,
    stopPolling,
    setPollingInterval,
  } = usePlaybackStore();

  const { addToHistory, advanceQueue } = useQueueStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(PAUSED_POLL_INTERVAL);
  const lastTrackIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);

  const poll = useCallback(async () => {
    if (isPollingRef.current) return; // Prevent concurrent polls
    isPollingRef.current = true;

    try {
      const state = await getPlaybackState();
      updatePlaybackState(state);

      // Track changed - add previous to history and advance queue
      if (state?.track && state.track.id !== lastTrackIdRef.current) {
        if (lastTrackIdRef.current && currentTrack) {
          addToHistory({
            id: currentTrack.id,
            name: currentTrack.name,
            artists: currentTrack.artists,
            album: currentTrack.album,
            durationMs: currentTrack.durationMs,
            addedAt: Date.now(),
          });
        }
        lastTrackIdRef.current = state.track.id;
        // Remove the now-playing track from the upcoming queue
        advanceQueue(state.track.id);
      }

      // Reset backoff on successful poll while playing
      if (state?.isPlaying) {
        backoffRef.current = PAUSED_POLL_INTERVAL;
      }
    } catch (error) {
      console.error("Playback polling error:", error);
      // Don't crash polling on error, just skip this cycle
    } finally {
      isPollingRef.current = false;
    }
  }, [updatePlaybackState, addToHistory, advanceQueue, currentTrack]);

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopPolling();
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab backgrounded - stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        stopPolling();
      } else {
        // Tab visible - resume polling
        poll(); // Immediate poll on focus
        startPolling();
        startInterval();
      }
    };

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      const interval = isPlaying ? ACTIVE_POLL_INTERVAL : backoffRef.current;
      setPollingInterval(interval);

      intervalRef.current = setInterval(() => {
        poll();
        // Increase backoff when paused
        if (!isPlaying) {
          backoffRef.current = Math.min(backoffRef.current * 1.5, MAX_BACKOFF);
        }
      }, interval);
    };

    // Initial poll and start
    poll();
    startPolling();
    startInterval();

    // Listen for visibility changes
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopPolling();
    };
  }, [poll, isPlaying, isAuthenticated, startPolling, stopPolling, setPollingInterval]);

  return { poll }; // Expose manual poll trigger
}
