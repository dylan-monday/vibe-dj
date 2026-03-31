"use client";

import { useQueueStore } from "@/lib/stores/queue-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { TrackItem } from "./track-item";

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const { upcomingTracks, playedTracks } = useQueueStore();
  const { currentTrack } = usePlaybackStore();

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-50
          max-h-[70dvh] rounded-t-3xl
          glass-elevated border-t border-white/10
          transition-transform duration-300 ease-out
          ${open ? "translate-y-0" : "translate-y-full"}
        `}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Tabs inside drawer */}
        <div className="overflow-y-auto max-h-[calc(70dvh-48px)] pb-safe">
          {/* Up Next section */}
          <div className="px-4 pb-2">
            <h3 className="text-sm font-medium text-foreground/50 uppercase tracking-wider">
              Up Next
            </h3>
          </div>

          {upcomingTracks.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-foreground/30 text-sm">Queue is empty</p>
              <p className="text-foreground/15 text-xs mt-1">
                Describe a vibe to fill it up
              </p>
            </div>
          ) : (
            <div className="px-2">
              {upcomingTracks.slice(0, 20).map((track, i) => (
                <TrackItem
                  key={`${track.id}-${i}`}
                  track={track}
                  variant="queue"
                  isCurrentTrack={false}
                />
              ))}
              {upcomingTracks.length > 20 && (
                <p className="text-center text-xs text-foreground/25 py-3">
                  +{upcomingTracks.length - 20} more
                </p>
              )}
            </div>
          )}

          {/* History section */}
          {playedTracks.length > 0 && (
            <>
              <div className="px-4 pt-4 pb-2 border-t border-white/5 mt-2">
                <h3 className="text-sm font-medium text-foreground/50 uppercase tracking-wider">
                  Recently Played
                </h3>
              </div>
              <div className="px-2">
                {playedTracks.slice(0, 10).map((track, i) => (
                  <TrackItem
                    key={`hist-${track.id}-${i}`}
                    track={track}
                    variant="history"
                    isCurrentTrack={currentTrack?.id === track.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
