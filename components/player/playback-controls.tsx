"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

export function PlaybackControls() {
  const {
    isPlaying,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    currentTrack,
  } = usePlaybackStore();

  const isDisabled = !currentTrack;

  // SVG icons as components for clarity
  const PlayIcon = () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );

  const PauseIcon = () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );

  const SkipNextIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 4.5L8 15v3zm8-12v12h2V6h-2z" />
    </svg>
  );

  const SkipPrevIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6zm6.5 3V9l-4.5 3 4.5 3z" />
    </svg>
  );

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Skip Previous */}
      <button
        onClick={() => skipToPrevious()}
        disabled={isDisabled}
        className={`
          w-12 h-12 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/80 hover:text-foreground hover:bg-surface-elevated active:scale-95"
          }
        `}
        aria-label="Previous track"
      >
        <SkipPrevIcon />
      </button>

      {/* Play/Pause - larger, primary action */}
      <button
        onClick={() => togglePlayPause()}
        disabled={isDisabled}
        className={`
          w-16 h-16 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "bg-surface text-foreground/30 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary-dark active:scale-95 shadow-lg shadow-primary/30"
          }
        `}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Skip Next */}
      <button
        onClick={() => skipToNext()}
        disabled={isDisabled}
        className={`
          w-12 h-12 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/80 hover:text-foreground hover:bg-surface-elevated active:scale-95"
          }
        `}
        aria-label="Next track"
      >
        <SkipNextIcon />
      </button>
    </div>
  );
}
