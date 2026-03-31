// Spotify search API wrapper
// Used for finding seed artists/tracks and search fallback

import { getSpotifyClient } from "./client";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";
import { Track } from "./types";

// Search for artists by name, returns first match
export async function searchArtist(
  name: string
): Promise<{ id: string; name: string } | null> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const results = await client.search(name, ["artist"], undefined, 1);
    const artist = results.artists?.items?.[0];
    return artist ? { id: artist.id, name: artist.name } : null;
  });
}

// Search for tracks by query, returns array of tracks
export async function searchTracks(
  query: string,
  limit: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 20 | 50 = 10
): Promise<Track[]> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const results = await client.search(query, ["track"], undefined, limit);
    const tracks = results.tracks?.items || [];

    return tracks.map((t) => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
      album: {
        id: t.album.id,
        name: t.album.name,
        images: t.album.images.map((img) => ({
          url: img.url,
          width: img.width ?? 0,
          height: img.height ?? 0,
        })),
      },
      durationMs: t.duration_ms,
    }));
  });
}

// Search for genre seeds - Spotify has a fixed list
export async function getAvailableGenreSeeds(): Promise<string[]> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const response = await client.recommendations.genreSeeds();
    return response.genres;
  });
}
