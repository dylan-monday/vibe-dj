---
phase: 7
plan: 1
title: Playlist Export
wave: 1
depends_on: [06-02-queue-feedback]
files_modified:
  - lib/spotify/playlists.ts
  - lib/spotify/index.ts
  - lib/hooks/use-session-export.ts
  - lib/hooks/index.ts
  - components/chat/session-actions.tsx
  - components/chat/index.ts
requirements_addressed: [PERS-01, PERS-02]
autonomous: true
---

<objective>
Create ability to save session's played tracks as a Spotify playlist.

Purpose: Users can export their curated session to a persistent playlist.
Output: "Save as Playlist" button that creates Spotify playlist with auto-naming.
</objective>

<must_haves>
- Create playlist in user's Spotify account
- Add all played tracks from session
- Auto-generate name from vibe description or date
- Success confirmation message
- Button in chat interface
</must_haves>

<task id="1">
<title>Create Spotify Playlist API Functions</title>
<action>
Create lib/spotify/playlists.ts:

```typescript
// Spotify playlist API wrapper
// Handles playlist creation and track management

import { getSpotifyClient } from "./client";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";

// Get current user's ID
export async function getCurrentUserId(): Promise<string> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const profile = await client.currentUser.profile();
    return profile.id;
  });
}

// Create a new playlist
export async function createPlaylist(
  name: string,
  description?: string
): Promise<{ id: string; url: string }> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const userId = await getCurrentUserId();
    const playlist = await client.playlists.createPlaylist(userId, {
      name,
      description: description || "Created by Vibe DJ",
      public: false,
    });
    return {
      id: playlist.id,
      url: playlist.external_urls.spotify,
    };
  });
}

// Add tracks to a playlist
export async function addTracksToPlaylist(
  playlistId: string,
  trackIds: string[]
): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  if (trackIds.length === 0) return;

  // Spotify allows max 100 tracks per request
  const uris = trackIds.map((id) => `spotify:track:${id}`);
  const chunks: string[][] = [];
  for (let i = 0; i < uris.length; i += 100) {
    chunks.push(uris.slice(i, i + 100));
  }

  return withErrorHandling(async () => {
    for (const chunk of chunks) {
      await client.playlists.addItemsToPlaylist(playlistId, chunk);
    }
  });
}
```
</action>
<acceptance_criteria>
- getCurrentUserId returns user's Spotify ID
- createPlaylist creates private playlist
- addTracksToPlaylist handles chunking for >100 tracks
</acceptance_criteria>
</task>

<task id="2">
<title>Update Spotify Exports</title>
<action>
Add to lib/spotify/index.ts:

```typescript
export * from "./playlists";
```
</action>
<acceptance_criteria>
- Playlist functions exported
</acceptance_criteria>
</task>

<task id="3">
<title>Create Session Export Hook</title>
<action>
Create lib/hooks/use-session-export.ts:

```typescript
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
      setState({ isExporting: false, error: "No tracks to export", playlistUrl: null });
      return null;
    }

    setState({ isExporting: true, error: null, playlistUrl: null });

    try {
      // Generate playlist name from vibe or date
      const latestVibe = recentVibes[recentVibes.length - 1];
      const vibeDescription = latestVibe?.genres.slice(0, 2).join(" + ") || "Vibe";
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
      const message = error instanceof Error ? error.message : "Failed to export";
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
```
</action>
<acceptance_criteria>
- exportToPlaylist creates playlist with session tracks
- Auto-generates name from vibe + date
- endSession exports and clears session
- Returns playlist URL on success
</acceptance_criteria>
</task>

<task id="4">
<title>Update Hooks Index</title>
<action>
Add to lib/hooks/index.ts:

```typescript
export { useSessionExport } from "./use-session-export";
```
</action>
<acceptance_criteria>
- useSessionExport exported
</acceptance_criteria>
</task>

<task id="5">
<title>Create Session Actions Component</title>
<action>
Create components/chat/session-actions.tsx:

```typescript
"use client";

import { useSessionExport } from "@/lib/hooks/use-session-export";

export function SessionActions() {
  const { exportToPlaylist, endSession, trackCount, isExporting, playlistUrl, error } =
    useSessionExport();

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
```
</action>
<acceptance_criteria>
- Shows track count
- Save Playlist button exports without clearing
- End & Save exports and clears session
- Shows success link to playlist
</acceptance_criteria>
</task>

<task id="6">
<title>Export Session Actions</title>
<action>
Add to components/chat/index.ts:

```typescript
export { SessionActions } from "./session-actions";
```
</action>
<acceptance_criteria>
- SessionActions exported
</acceptance_criteria>
</task>

<verification>
```bash
npx tsc --noEmit
npm run build
```
</verification>
