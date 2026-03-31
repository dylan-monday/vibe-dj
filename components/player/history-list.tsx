"use client";

import { useQueueStore } from "@/lib/stores/queue-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { TrackItem } from "./track-item";

interface HistoryListProps {
  maxTracks?: number;
}

export function HistoryList({ maxTracks = 20 }: HistoryListProps) {
  const { playedTracks, clearHistory } = useQueueStore();
  const { currentTrack } = usePlaybackStore();

  if (playedTracks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-foreground/50 text-sm">No history yet</p>
        <p className="text-foreground/30 text-xs mt-1">
          Played tracks will appear here
        </p>
      </div>
    );
  }

  const displayTracks = playedTracks.slice(0, maxTracks);

  return (
    <div className="space-y-1">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Recently Played</h3>
        <button
          onClick={() => clearHistory()}
          className="text-xs text-foreground/50 hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-2">
        {displayTracks.map((track, index) => (
          <TrackItem
            key={`${track.id}-${track.addedAt}-${index}`}
            track={track}
            variant="history"
            isCurrentTrack={currentTrack?.id === track.id}
          />
        ))}
        {playedTracks.length > maxTracks && (
          <p className="text-center text-xs text-foreground/40 py-2">
            Showing {maxTracks} of {playedTracks.length} tracks
          </p>
        )}
      </div>
    </div>
  );
}
