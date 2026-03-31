// Hook to poll Spotify playback state
// Handles Page Visibility API, exponential backoff, and history tracking

"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import { getPlaybackState } from "@/lib/spotify/playback";
import { isRateLimited, rateLimitRemainingMs } from "@/lib/spotify/rate-limit";

const ACTIVE_POLL_INTERVAL = 10000; // 10 seconds when playing
const PAUSED_POLL_INTERVAL = 30000; // 30 seconds when paused
const MAX_BACKOFF = 120000; // Max 2 minutes
const MAX_CONSECUTIVE_FAILURES = 3; // Circuit breaker threshold
const CIRCUIT_BREAKER_KEY = "vibe-dj-circuit-breaker";

// Persist circuit breaker state across page refreshes
function loadCircuitBreakerState(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem(CIRCUIT_BREAKER_KEY);
  return stored === "true";
}

function saveCircuitBreakerState(isOpen: boolean): void {
  if (typeof window !== "undefined") {
    if (isOpen) {
      localStorage.setItem(CIRCUIT_BREAKER_KEY, "true");
    } else {
      localStorage.removeItem(CIRCUIT_BREAKER_KEY);
    }
  }
}

export function usePlaybackPolling(enabled = true) {
  const { isAuthenticated } = useAuthStore();
  const {
    updatePlaybackState,
    isPlaying,
    startPolling,
    stopPolling,
    setPollingInterval,
  } = usePlaybackStore();

  const { addToHistory, advanceQueue } = useQueueStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(PAUSED_POLL_INTERVAL);
  const lastTrackIdRef = useRef<string | null>(null);
  const isPollingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);
  const circuitOpenRef = useRef(loadCircuitBreakerState());

  // Store previous track data in a ref to avoid stale closure issues
  const previousTrackRef = useRef<{
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: { id: string; name: string; images: { url: string; width: number; height: number }[] };
    durationMs: number;
  } | null>(null);

  // Reset circuit breaker - call this to resume polling after it was tripped
  const resetCircuitBreaker = useCallback(() => {
    circuitOpenRef.current = false;
    saveCircuitBreakerState(false);
    consecutiveFailuresRef.current = 0;
    backoffRef.current = PAUSED_POLL_INTERVAL;
    usePlaybackStore.getState().setPollingError(null);
    console.log("[Polling] Circuit breaker reset");
  }, []);

  const poll = useCallback(async () => {
    if (isPollingRef.current) return; // Prevent concurrent polls

    // Circuit breaker is open - don't poll at all
    if (circuitOpenRef.current) {
      console.log("[Polling] Circuit breaker OPEN - polling stopped");
      return;
    }

    // Check rate limit - skip poll entirely if we're in backoff
    if (isRateLimited()) {
      console.log("[Polling] Skipping - rate limited for", rateLimitRemainingMs(), "ms");
      return;
    }

    isPollingRef.current = true;

    try {
      const state = await getPlaybackState();

      // Success! Reset failure counter
      consecutiveFailuresRef.current = 0;
      updatePlaybackState(state);

      // Track changed - add previous to history and advance queue
      if (state?.track && state.track.id !== lastTrackIdRef.current) {
        // Use the ref for previous track data (not stale closure)
        if (lastTrackIdRef.current && previousTrackRef.current) {
          addToHistory({
            id: previousTrackRef.current.id,
            name: previousTrackRef.current.name,
            artists: previousTrackRef.current.artists,
            album: previousTrackRef.current.album,
            durationMs: previousTrackRef.current.durationMs,
            addedAt: Date.now(),
          });
        }
        lastTrackIdRef.current = state.track.id;
        // Store current track for next transition
        previousTrackRef.current = state.track;
        // Remove the now-playing track from the upcoming queue
        advanceQueue(state.track.id);
      }

      // Reset backoff on successful poll
      backoffRef.current = PAUSED_POLL_INTERVAL;
      usePlaybackStore.getState().setPollingError(null);
    } catch (error) {
      consecutiveFailuresRef.current++;
      const msg = error instanceof Error ? error.message : "Polling failed";
      const isRateLimit = msg.toLowerCase().includes("rate") || msg.toLowerCase().includes("exceeded");

      console.log(`[Polling] Failure ${consecutiveFailuresRef.current}/${MAX_CONSECUTIVE_FAILURES}: ${msg}`);

      // Circuit breaker: too many consecutive failures = stop polling entirely
      if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
        circuitOpenRef.current = true;
        saveCircuitBreakerState(true);
        console.log("[Polling] Circuit breaker TRIPPED - stopping all polling");
        usePlaybackStore.getState().setPollingError("circuit_open");
        // Clear the interval to stop polling completely
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        stopPolling();
        return;
      }

      usePlaybackStore.getState().setPollingError(isRateLimit ? "rate_limited" : msg);

      // Back off aggressively on rate limit
      if (isRateLimit) {
        backoffRef.current = 60000; // 60s before next attempt
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [updatePlaybackState, addToHistory, advanceQueue, stopPolling]);

  useEffect(() => {
    if (!isAuthenticated || !enabled) {
      // Clear interval if not authenticated
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopPolling();
      return;
    }

    // Check circuit breaker BEFORE starting polling
    if (circuitOpenRef.current) {
      console.log("[Polling] Circuit breaker is OPEN on mount - not starting polling");
      usePlaybackStore.getState().setPollingError("circuit_open");
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
        // Tab visible - resume polling (but only if circuit breaker is closed)
        if (!circuitOpenRef.current) {
          poll(); // Immediate poll on focus
          startPolling();
          startInterval();
        }
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

    // Initial poll and start (only if circuit breaker is closed)
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
  }, [poll, isPlaying, isAuthenticated, enabled, startPolling, stopPolling, setPollingInterval]);

  return {
    poll,
    resetCircuitBreaker,
    isCircuitOpen: circuitOpenRef.current,
  };
}
