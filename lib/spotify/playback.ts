// Spotify playback API wrapper
// Handles playback state retrieval and control operations

import { getSpotifyClient } from "./client";
import { PlaybackState } from "./types";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";

// Get current playback state
export async function getPlaybackState(): Promise<PlaybackState | null> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  try {
    return await withErrorHandling(async () => {
      const state = await client.player.getPlaybackState();

      // Handle 204 - no active playback
      if (!state || !state.item) {
        return null;
      }

      // Map SDK response to our PlaybackState type
      // Only handle tracks, not episodes/podcasts
      const track = state.item.type === "track" && "artists" in state.item ? {
        id: state.item.id,
        name: state.item.name,
        artists: state.item.artists.map((a: { id: string; name: string }) => ({
          id: a.id,
          name: a.name,
        })),
        album: {
          id: state.item.album.id,
          name: state.item.album.name,
          images: state.item.album.images.map((img: { url: string; width: number; height: number }) => ({
            url: img.url,
            width: img.width,
            height: img.height,
          })),
        },
        durationMs: state.item.duration_ms,
      } : null;

      return {
        isPlaying: state.is_playing,
        track,
        progressMs: state.progress_ms || 0,
        device: state.device ? {
          id: state.device.id,
          is_active: state.device.is_active,
          is_private_session: state.device.is_private_session,
          is_restricted: state.device.is_restricted,
          name: state.device.name,
          type: state.device.type,
          volume_percent: state.device.volume_percent,
        } : null,
      };
    });
  } catch (error) {
    // 204 is normal when no playback is active
    if (error instanceof SpotifyApiError && error.statusCode === 204) {
      return null;
    }
    throw error;
  }
}

// Resume playback
export async function play(): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Pass empty string to use currently active device
    await client.player.startResumePlayback("");
  });
}

// Pause playback
export async function pause(): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Pass empty string to use currently active device
    await client.player.pausePlayback("");
  });
}

// Skip to next track
export async function skipNext(): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Pass empty string to use currently active device
    await client.player.skipToNext("");
  });
}

// Skip to previous track
export async function skipPrevious(): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Pass empty string to use currently active device
    await client.player.skipToPrevious("");
  });
}

// Set volume (0-100)
export async function setVolume(percent: number): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  // Clamp to 0-100 range
  const clampedPercent = Math.max(0, Math.min(100, Math.round(percent)));

  return withErrorHandling(async () => {
    await client.player.setPlaybackVolume(clampedPercent);
  });
}

// Seek to position in track
export async function seekToPosition(positionMs: number): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.player.seekToPosition(positionMs);
  });
}
