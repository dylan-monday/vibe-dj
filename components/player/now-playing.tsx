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
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <AlbumArt imageUrl={null} albumName="Nothing playing" size="hero" />
        <div className="text-center space-y-2">
          <p className="text-xl text-foreground/70">Nothing playing</p>
          <p className="text-sm text-foreground/50">
            Start playing music on Spotify to see it here
          </p>
        </div>
      </div>
    );
  }

  // Get best quality album image (first is usually largest)
  const albumImageUrl = currentTrack.album.images[0]?.url || null;

  // Format artist names
  const artistNames = currentTrack.artists.map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col items-center space-y-6 px-4">
      {/* Stale indicator - subtle, non-intrusive */}
      {isStale && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-foreground/40">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          <span>Syncing...</span>
        </div>
      )}

      {/* Album art hero */}
      <AlbumArt
        imageUrl={albumImageUrl}
        albumName={currentTrack.album.name}
        size="hero"
      />

      {/* Track info */}
      <div className="w-full max-w-[400px] text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-display text-foreground truncate">
          {currentTrack.name}
        </h2>
        <p className="text-base text-foreground/70 truncate">{artistNames}</p>
        <p className="text-sm text-foreground/50 truncate">
          {currentTrack.album.name}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[400px]">
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
