// Hook to interpolate playback progress between polls
// Provides smooth progress bar movement instead of jumpy updates

"use client";

import { useEffect, useRef, useState } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";

const INTERPOLATION_INTERVAL = 100; // Update every 100ms

export function useInterpolatedProgress() {
  const { progressMs, durationMs, isPlaying, lastPolledAt } = usePlaybackStore();
  const [interpolatedProgress, setInterpolatedProgress] = useState(progressMs);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastProgressRef = useRef(progressMs);
  const lastPollTimeRef = useRef(lastPolledAt);

  // Reset interpolation when we get new data from poll
  useEffect(() => {
    if (lastPolledAt !== lastPollTimeRef.current) {
      lastPollTimeRef.current = lastPolledAt;
      lastProgressRef.current = progressMs;
      setInterpolatedProgress(progressMs);
    }
  }, [progressMs, lastPolledAt]);

  // Interpolate progress while playing
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPlaying || durationMs === 0) {
      setInterpolatedProgress(progressMs);
      return;
    }

    intervalRef.current = setInterval(() => {
      setInterpolatedProgress((prev) => {
        const newProgress = prev + INTERPOLATION_INTERVAL;
        // Don't exceed duration
        return Math.min(newProgress, durationMs);
      });
    }, INTERPOLATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, durationMs, progressMs]);

  return {
    progressMs: interpolatedProgress,
    progressPercent: durationMs > 0 ? (interpolatedProgress / durationMs) * 100 : 0,
  };
}
