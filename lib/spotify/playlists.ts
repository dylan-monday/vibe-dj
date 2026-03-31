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
