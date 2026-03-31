"use client";

import { AlbumArt } from "./album-art";

interface TrackItemProps {
  track: {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; width: number; height: number }[];
    };
    durationMs: number;
  };
  variant?: "queue" | "history";
  isCurrentTrack?: boolean;
  onClick?: () => void;
}

// Format duration to m:ss
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackItem({
  track,
  variant = "queue",
  isCurrentTrack = false,
  onClick,
}: TrackItemProps) {
  const albumImageUrl = track.album.images[track.album.images.length - 1]?.url || null;
  const artistNames = track.artists.map((a) => a.name).join(", ");

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-colors
        ${isCurrentTrack
          ? "bg-primary/20 border border-primary/30"
          : "hover:bg-surface-elevated active:bg-surface-elevated/80"
        }
        ${!onClick ? "cursor-default" : ""}
        min-h-[56px] touch-manipulation
      `}
    >
      {/* Album thumbnail */}
      <AlbumArt
        imageUrl={albumImageUrl}
        albumName={track.album.name}
        size="sm"
      />

      {/* Track info */}
      <div className="flex-1 min-w-0 text-left">
        <p
          className={`text-sm font-medium truncate ${
            isCurrentTrack ? "text-primary" : "text-foreground"
          }`}
        >
          {track.name}
        </p>
        <p className="text-xs text-foreground/60 truncate">{artistNames}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-foreground/50 font-mono tabular-nums">
        {formatDuration(track.durationMs)}
      </span>

      {/* Playing indicator for current track */}
      {isCurrentTrack && (
        <div className="flex gap-0.5 items-end h-4">
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "60%" }} />
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "100%", animationDelay: "0.2s" }} />
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "40%", animationDelay: "0.4s" }} />
        </div>
      )}
    </button>
  );
}
