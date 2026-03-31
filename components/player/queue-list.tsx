"use client";

import { useQueueStore } from "@/lib/stores/queue-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { TrackItem } from "./track-item";

interface QueueListProps {
  maxTracks?: number;
}

export function QueueList({ maxTracks = 10 }: QueueListProps) {
  const { upcomingTracks } = useQueueStore();
  const { currentTrack } = usePlaybackStore();

  const displayTracks = upcomingTracks.slice(0, maxTracks);

  if (displayTracks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-foreground/50 text-sm">Queue is empty</p>
        <p className="text-foreground/30 text-xs mt-1">
          Tracks will appear here when you start a vibe
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Up Next</h3>
        <span className="text-xs text-foreground/50">
          {upcomingTracks.length} tracks
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto px-2">
        {displayTracks.map((track, index) => (
          <TrackItem
            key={`${track.id}-${index}`}
            track={track}
            variant="queue"
            isCurrentTrack={currentTrack?.id === track.id}
          />
        ))}
        {upcomingTracks.length > maxTracks && (
          <p className="text-center text-xs text-foreground/40 py-2">
            +{upcomingTracks.length - maxTracks} more tracks
          </p>
        )}
      </div>
    </div>
  );
}
