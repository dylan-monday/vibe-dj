// Queue and history store using Zustand with persistence
// Manages upcoming tracks and session history

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { QueueTrack } from "@/lib/spotify/types";

interface QueueStore {
  // Queue state
  upcomingTracks: QueueTrack[];

  // History state (persisted to sessionStorage)
  playedTracks: QueueTrack[];
  sessionId: string; // UUID generated on first load

  // Actions
  setUpcoming: (tracks: QueueTrack[]) => void;
  advanceQueue: (nowPlayingId: string) => void;
  addToHistory: (track: QueueTrack) => void;
  clearHistory: () => void;
  clearQueue: () => void;
}

export const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      // Initial state
      upcomingTracks: [],
      playedTracks: [],
      sessionId: crypto.randomUUID(),

      // Set upcoming tracks (replaces entire queue)
      setUpcoming: (tracks: QueueTrack[]) => {
        set({ upcomingTracks: tracks });
      },

      // Remove the now-playing track from upcoming (advance the queue)
      advanceQueue: (nowPlayingId: string) => {
        const { upcomingTracks } = get();
        const idx = upcomingTracks.findIndex((t) => t.id === nowPlayingId);
        if (idx !== -1) {
          // Remove everything up to and including the now-playing track
          set({ upcomingTracks: upcomingTracks.slice(idx + 1) });
        }
      },

      // Add track to history
      addToHistory: (track: QueueTrack) => {
        const { playedTracks } = get();

        // Check if track is already at the top (avoid duplicates)
        if (playedTracks.length > 0 && playedTracks[0].id === track.id) {
          return;
        }

        // Add to beginning, limit to 100 tracks
        const newHistory = [track, ...playedTracks].slice(0, 100);
        set({ playedTracks: newHistory });
      },

      // Clear history
      clearHistory: () => {
        set({ playedTracks: [] });
      },

      // Clear queue
      clearQueue: () => {
        set({ upcomingTracks: [] });
      },
    }),
    {
      name: "vibe-dj-queue",
      storage: createJSONStorage(() => sessionStorage),
      // Only persist history and session ID, not upcoming tracks
      partialize: (state) => ({
        playedTracks: state.playedTracks,
        sessionId: state.sessionId,
      }),
    }
  )
);
