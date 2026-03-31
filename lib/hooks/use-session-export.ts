"use client";

import { useState, useCallback } from "react";
import { useSessionStore } from "@/lib/stores/session-store";
import { createPlaylist, addTracksToPlaylist } from "@/lib/spotify";

interface ExportState {
  isExporting: boolean;
  error: string | null;
  playlistUrl: string | null;
}

export function useSessionExport() {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    error: null,
    playlistUrl: null,
  });

  const { playedTrackIds, recentVibes, clearSession } = useSessionStore();

  const exportToPlaylist = useCallback(async () => {
    if (playedTrackIds.length === 0) {
      setState({
        isExporting: false,
        error: "No tracks to export",
        playlistUrl: null,
      });
      return null;
    }

    setState({ isExporting: true, error: null, playlistUrl: null });

    try {
      // Generate playlist name from vibe or date
      const latestVibe = recentVibes[recentVibes.length - 1];
      const vibeDescription =
        latestVibe?.genres.slice(0, 2).join(" + ") || "Vibe";
      const date = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      const name = `${vibeDescription} — ${date}`;
      const description = latestVibe
        ? `Energy: ${Math.round(latestVibe.energy * 100)}% | Mood: ${Math.round(latestVibe.valence * 100)}%`
        : "Created by Vibe DJ";

      // Create playlist and add tracks
      const { id, url } = await createPlaylist(name, description);
      await addTracksToPlaylist(id, playedTrackIds);

      setState({ isExporting: false, error: null, playlistUrl: url });
      return url;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to export";
      setState({ isExporting: false, error: message, playlistUrl: null });
      return null;
    }
  }, [playedTrackIds, recentVibes]);

  const endSession = useCallback(async () => {
    const url = await exportToPlaylist();
    if (url) {
      clearSession();
    }
    return url;
  }, [exportToPlaylist, clearSession]);

  return {
    exportToPlaylist,
    endSession,
    trackCount: playedTrackIds.length,
    ...state,
  };
}
