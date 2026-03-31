// Spotify Connect device management
// Handles device listing, selection, and playback transfer

import { getSpotifyClient } from "./client";
import { SpotifyDevice } from "./types";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";

// Re-export SpotifyApiError for consumers
export { SpotifyApiError };

// Get available devices
export async function getDevices(): Promise<SpotifyDevice[]> {
  const { isRateLimited } = await import("./rate-limit");
  if (isRateLimited()) {
    throw new SpotifyApiError("Rate limited. Please wait before trying again.", 429);
  }

  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    const response = await client.player.getAvailableDevices();
    return response.devices.map((device) => ({
      id: device.id,
      is_active: device.is_active,
      is_private_session: device.is_private_session,
      is_restricted: device.is_restricted,
      name: device.name,
      type: device.type,
      volume_percent: device.volume_percent,
    }));
  });
}

// Transfer playback to device
export async function transferPlayback(
  deviceId: string,
  startPlaying = false
): Promise<void> {
  const { isRateLimited } = await import("./rate-limit");
  if (isRateLimited()) {
    throw new SpotifyApiError("Rate limited. Please wait before trying again.", 429);
  }

  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  return withErrorHandling(async () => {
    await client.player.transferPlayback([deviceId], startPlaying);
  });
}

// Get currently active device
export async function getActiveDevice(): Promise<SpotifyDevice | null> {
  const devices = await getDevices();
  return devices.find((d) => d.is_active) || null;
}

// Check if device is likely a Sonos speaker
export function isSonosDevice(device: SpotifyDevice): boolean {
  const name = device.name.toLowerCase();
  return (
    name.includes("sonos") ||
    device.type === "Speaker" ||
    device.type === "AVR"
  );
}

// Device type to icon mapping helper
export function getDeviceIcon(type: string): string {
  switch (type.toLowerCase()) {
    case "computer":
      return "laptop";
    case "smartphone":
      return "smartphone";
    case "speaker":
    case "avr":
      return "speaker";
    case "tv":
      return "tv";
    case "automobile":
      return "car";
    default:
      return "device";
  }
}
