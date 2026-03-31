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
