"use client";

import { useSessionExport } from "@/lib/hooks/use-session-export";

export function SessionActions() {
  const {
    exportToPlaylist,
    endSession,
    trackCount,
    isExporting,
    playlistUrl,
    error,
  } = useSessionExport();

  if (trackCount === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2 p-4 border-t border-white/10">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/60">
          {trackCount} tracks played this session
        </span>
        <div className="flex gap-2">
          <button
            onClick={exportToPlaylist}
            disabled={isExporting}
            className={`
              px-3 py-1.5 rounded-lg text-sm
              bg-white/5 hover:bg-white/10 border border-white/10
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            {isExporting ? "Saving..." : "Save Playlist"}
          </button>
          <button
            onClick={endSession}
            disabled={isExporting}
            className={`
              px-3 py-1.5 rounded-lg text-sm
              bg-primary/20 hover:bg-primary/30 text-primary
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            `}
          >
            End & Save
          </button>
        </div>
      </div>

      {playlistUrl && (
        <div className="text-sm text-green-400">
          Playlist saved!{" "}
          <a
            href={playlistUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-green-300"
          >
            Open in Spotify
          </a>
        </div>
      )}

      {error && <div className="text-sm text-red-400">{error}</div>}
    </div>
  );
}
