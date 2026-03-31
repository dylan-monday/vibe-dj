---
phase: 6
plan: 1
title: Track Actions (Like/Save)
wave: 1
depends_on: [05-03-search-fallback]
files_modified:
  - lib/spotify/library.ts
  - lib/spotify/index.ts
  - components/player/track-actions.tsx
  - components/player/index.ts
requirements_addressed: [PLAY-04]
autonomous: true
---

<objective>
Add track actions for liking and saving tracks to playlists.

Purpose: Users can like the current track or save it to a playlist.
Output: Track action buttons with Spotify API integration.
</objective>

<must_haves>
- Like button that saves to Spotify "Liked Songs"
- Visual feedback when liked (heart fills in)
- Check if track is already liked on load
- Toast notification on action completion
</must_haves>

<task id="1">
<title>Create Spotify Library API Functions</title>
<action>
Create lib/spotify/library.ts:

```typescript
// Spotify library API wrapper
// Handles saved tracks (likes) and playlist operations

import { getSpotifyClient } from "./client";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";

// Check if tracks are saved in user's library
export async function checkSavedTracks(trackIds: string[]): Promise<boolean[]> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    return await client.currentUser.tracks.hasSavedTracks(trackIds);
  });
}

// Save tracks to user's library (Like)
export async function saveTracks(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.currentUser.tracks.saveTracks(trackIds);
  });
}

// Remove tracks from user's library (Unlike)
export async function removeSavedTracks(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.currentUser.tracks.removeSavedTracks(trackIds);
  });
}
```
</action>
<acceptance_criteria>
- checkSavedTracks returns array of booleans
- saveTracks adds to Liked Songs
- removeSavedTracks removes from Liked Songs
</acceptance_criteria>
</task>

<task id="2">
<title>Update Spotify Exports</title>
<action>
Update lib/spotify/index.ts to export library functions:

```typescript
export * from "./library";
```
</action>
<acceptance_criteria>
- Library functions exported from spotify module
</acceptance_criteria>
</task>

<task id="3">
<title>Create Track Actions Component</title>
<action>
Create components/player/track-actions.tsx:

```typescript
"use client";

import { useState, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { checkSavedTracks, saveTracks, removeSavedTracks } from "@/lib/spotify";

export function TrackActions() {
  const { currentTrack } = usePlaybackStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current track is liked when track changes
  useEffect(() => {
    if (!currentTrack?.id) {
      setIsLiked(false);
      return;
    }

    const checkLiked = async () => {
      try {
        const [liked] = await checkSavedTracks([currentTrack.id]);
        setIsLiked(liked);
      } catch {
        // Silently fail - not critical
      }
    };

    checkLiked();
  }, [currentTrack?.id]);

  const handleToggleLike = async () => {
    if (!currentTrack?.id || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await removeSavedTracks([currentTrack.id]);
        setIsLiked(false);
      } else {
        await saveTracks([currentTrack.id]);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleLike}
        disabled={isLoading}
        className={`
          p-2 rounded-full transition-all duration-200
          ${isLiked ? "text-primary" : "text-foreground/60 hover:text-foreground"}
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          active:scale-95
        `}
        aria-label={isLiked ? "Unlike track" : "Like track"}
      >
        <svg
          className="w-6 h-6"
          fill={isLiked ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={isLiked ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>
    </div>
  );
}
```
</action>
<acceptance_criteria>
- Heart icon toggles between filled/unfilled
- Checks liked status when track changes
- Disabled state during API call
- Works with current playing track
</acceptance_criteria>
</task>

<task id="4">
<title>Export Track Actions</title>
<action>
Update components/player/index.ts to export TrackActions:

```typescript
export { TrackActions } from "./track-actions";
```
</action>
<acceptance_criteria>
- TrackActions exported from player module
</acceptance_criteria>
</task>

<verification>
```bash
npx tsc --noEmit
npm run build
```
</verification>
