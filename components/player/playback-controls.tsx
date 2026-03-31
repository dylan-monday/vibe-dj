"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

export function PlaybackControls() {
  const {
    isPlaying,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    currentTrack,
    playbackError,
  } = usePlaybackStore();

  const isDisabled = !currentTrack;

  // SVG icons
  const PlayIcon = () => (
    <svg className="w-8 h-8 ml-1" viewBox="0 0 24 24" fill="currentColor">
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
    <div className="flex flex-col items-center gap-3">
      {/* Error message */}
      {playbackError && (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full">
          {playbackError}
        </div>
      )}

      <div className="flex items-center justify-center gap-6">
        {/* Skip Previous */}
        <button
          onClick={() => skipToPrevious()}
          disabled={isDisabled}
          className={`
            w-14 h-14 flex items-center justify-center rounded-full
            transition-all duration-200 btn-ghost
            ${isDisabled
              ? "opacity-30 cursor-not-allowed"
              : "hover:scale-105 active:scale-95"
            }
          `}
          aria-label="Previous track"
        >
          <SkipPrevIcon />
        </button>

        {/* Play/Pause - hero button */}
        <button
          onClick={() => togglePlayPause()}
          disabled={isDisabled}
          className={`
            w-18 h-18 flex items-center justify-center rounded-full
            transition-all duration-200
            ${isDisabled
              ? "bg-surface/50 text-foreground/30 cursor-not-allowed"
              : "btn-gradient text-white hover:scale-105 active:scale-95"
            }
          `}
          style={{ width: "72px", height: "72px" }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip Next */}
        <button
          onClick={() => skipToNext()}
          disabled={isDisabled}
          className={`
            w-14 h-14 flex items-center justify-center rounded-full
            transition-all duration-200 btn-ghost
            ${isDisabled
              ? "opacity-30 cursor-not-allowed"
              : "hover:scale-105 active:scale-95"
            }
          `}
          aria-label="Next track"
        >
          <SkipNextIcon />
        </button>
      </div>
    </div>
  );
}
