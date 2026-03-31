"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";
import { ProgressBar } from "./progress-bar";

export function NowPlayingBar() {
  const {
    currentTrack,
    isPlaying,
    progressMs,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
  } = usePlaybackStore();

  if (!currentTrack) {
    return (
      <div className="h-20 glass-elevated border-t border-white/5 flex items-center justify-center">
        <p className="text-sm text-foreground/40">No track playing</p>
      </div>
    );
  }

  const albumArt = currentTrack.album.images[0]?.url;
  const artistNames = currentTrack.artists.map((a) => a.name).join(", ");

  return (
    <div className="glass-elevated border-t border-white/5">
      {/* Progress bar - thin line at top */}
      <div className="h-1 bg-white/5">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent-magenta transition-all duration-300"
          style={{
            width: `${(progressMs / currentTrack.durationMs) * 100}%`,
          }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Album art */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-lg">
          {albumArt ? (
            <img
              src={albumArt}
              alt={currentTrack.album.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
        </div>

        {/* Track info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {currentTrack.name}
          </p>
          <p className="text-xs text-foreground/50 truncate">
            {artistNames}
          </p>
        </div>

        {/* Compact controls */}
        <div className="flex items-center gap-1">
          {/* Previous */}
          <button
            onClick={() => skipToPrevious()}
            className="w-10 h-10 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
            </svg>
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => togglePlayPause()}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-background hover:scale-105 active:scale-95 transition-all"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            )}
          </button>

          {/* Next */}
          <button
            onClick={() => skipToNext()}
            className="w-10 h-10 flex items-center justify-center rounded-full text-foreground/60 hover:text-foreground hover:bg-white/5 transition-all"
            aria-label="Next"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zm10 0V6h2v12h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
