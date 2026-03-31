// Spotify playback API wrapper
// Handles playback state retrieval and control operations

import { getSpotifyClient } from "./client";
import { PlaybackState } from "./types";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";
import { getDevices } from "./devices";

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
export async function play(deviceId?: string): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    // Pass deviceId or empty string to use currently active device
    await client.player.startResumePlayback(deviceId ?? "");
  });
}

// Pause playback
export async function pause(deviceId?: string): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.player.pausePlayback(deviceId ?? "");
  });
}

// Skip to next track
export async function skipNext(deviceId?: string): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.player.skipToNext(deviceId ?? "");
  });
}

// Skip to previous track
export async function skipPrevious(deviceId?: string): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.player.skipToPrevious(deviceId ?? "");
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

// Play specific tracks (adds to queue and starts playback)
export async function playTracks(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  if (trackIds.length === 0) {
    throw new SpotifyApiError("No tracks to play", 400);
  }

  // Convert IDs to URIs
  const uris = trackIds.map((id) => `spotify:track:${id}`);

  // Find a device to play on
  const devices = await getDevices();
  if (devices.length === 0) {
    throw new SpotifyApiError(
      "No Spotify devices found. Open Spotify on your phone, computer, or speaker.",
      404
    );
  }

  // Prefer active device, otherwise use first available
  const targetDevice = devices.find((d) => d.is_active) || devices[0];

  if (!targetDevice.id) {
    throw new SpotifyApiError(
      `Device "${targetDevice.name}" has no ID. Try a different device.`,
      400
    );
  }

  console.log(`[playTracks] Using device: ${targetDevice.name} (${targetDevice.id})`);

  return withErrorHandling(async () => {
    // Start playback with the track URIs on the target device
    await client.player.startResumePlayback(targetDevice.id!, undefined, uris);
  });
}

// Add tracks to queue (after currently playing track)
export async function addToQueue(trackIds: string[]): Promise<void> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  // Find active device for queue operations
  const devices = await getDevices();
  const activeDevice = devices.find((d) => d.is_active);
  if (!activeDevice) {
    throw new SpotifyApiError(
      "No active Spotify device. Start playing something first.",
      404
    );
  }

  return withErrorHandling(async () => {
    // Add each track to queue sequentially
    for (const trackId of trackIds) {
      const uri = `spotify:track:${trackId}`;
      await client.player.addItemToPlaybackQueue(uri, activeDevice.id || undefined);
    }
  });
}
