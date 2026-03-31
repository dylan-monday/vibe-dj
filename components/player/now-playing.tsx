"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";
import { AlbumArt } from "./album-art";
import { ProgressBar } from "./progress-bar";

export function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    progressMs,
    durationMs,
    isStale,
    seekTo,
  } = usePlaybackStore();

  // Nothing playing state
  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-6">
        <div className="relative">
          <div className="w-48 h-48 rounded-2xl bg-surface-elevated flex items-center justify-center">
            <svg
              className="w-16 h-16 text-foreground/20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
              />
            </svg>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl text-foreground/60 font-display">Nothing playing</p>
          <p className="text-sm text-foreground/40">
            Start playing music on Spotify
          </p>
        </div>
      </div>
    );
  }

  // Get best quality album image
  const albumImageUrl = currentTrack.album.images[0]?.url || null;
  const artistNames = currentTrack.artists.map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col items-center space-y-6 relative">
      {/* Stale indicator */}
      {isStale && (
        <div className="absolute top-0 right-0 flex items-center gap-1.5 text-xs text-foreground/40 bg-surface/50 px-2 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse" />
          <span>Syncing</span>
        </div>
      )}

      {/* Album art with glow effect */}
      <div className={`relative ${isPlaying ? "pulse-active" : ""}`}>
        <AlbumArt
          imageUrl={albumImageUrl}
          albumName={currentTrack.album.name}
          size="hero"
        />
        {/* Ambient glow behind album art */}
        {albumImageUrl && (
          <div
            className="absolute inset-0 -z-10 blur-3xl opacity-40 scale-150"
            style={{
              backgroundImage: `url(${albumImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        )}
      </div>

      {/* Track info */}
      <div className="w-full max-w-md text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-display text-foreground tracking-tight">
          {currentTrack.name}
        </h2>
        <p className="text-base text-foreground/60">{artistNames}</p>
        <p className="text-sm text-foreground/40">{currentTrack.album.name}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <ProgressBar
          progressMs={progressMs}
          durationMs={currentTrack.durationMs}
          isPlaying={isPlaying}
          onSeek={seekTo}
        />
      </div>
    </div>
  );
}
