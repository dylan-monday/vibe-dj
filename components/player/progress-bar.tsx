"use client";

import { useEffect, useState, useRef } from "react";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  onSeek?: (positionMs: number) => void;
}

// Format milliseconds to mm:ss
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ProgressBar({
  progressMs,
  durationMs,
  isPlaying,
  onSeek,
}: ProgressBarProps) {
  // Local state for smooth interpolation between polls
  const [localProgress, setLocalProgress] = useState(progressMs);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Sync with server progress when it changes
  useEffect(() => {
    setLocalProgress(progressMs);
    lastUpdateRef.current = Date.now();
  }, [progressMs]);

  // Interpolate progress when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setLocalProgress((prev) => {
        const next = prev + elapsed;
        return Math.min(next, durationMs);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, durationMs]);

  const percent = durationMs > 0 ? (localProgress / durationMs) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || durationMs === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const seekMs = Math.floor(percent * durationMs);
    onSeek(seekMs);
  };

  // Touch-friendly: min height 44px for tap target
  return (
    <div className="w-full space-y-2">
      {/* Progress bar track */}
      <div
        className="relative h-2 bg-surface-elevated rounded-full overflow-hidden cursor-pointer touch-manipulation"
        onClick={handleClick}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={localProgress}
        tabIndex={0}
        style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
      >
        {/* Inner track (actual 8px height, centered for touch target) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-surface-elevated rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-primary to-accent-magenta rounded-full transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-foreground/60 font-mono">
        <span>{formatTime(localProgress)}</span>
        <span>{formatTime(durationMs)}</span>
      </div>
    </div>
  );
}
