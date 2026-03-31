// Spotify API types for Vibe DJ
// Using @spotify/web-api-ts-sdk types where possible, extending where needed

import { SpotifyApi, AccessToken } from "@spotify/web-api-ts-sdk";

// Re-export SDK types we'll use frequently
export type { SpotifyApi, AccessToken };

// App-specific token state
export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// Device types for Spotify Connect
export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string; // "Computer", "Smartphone", "Speaker", etc.
  volume_percent: number | null;
}

// Playback state (subset of SDK's PlaybackState)
export interface PlaybackState {
  isPlaying: boolean;
  track: {
    id: string;
    name: string;
    artists: { id: string; name: string }[];
    album: {
      id: string;
      name: string;
      images: { url: string; width: number; height: number }[];
    };
    durationMs: number;
  } | null;
  progressMs: number;
  device: SpotifyDevice | null;
}

// Queue track (for upcoming and history)
export interface QueueTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: {
    id: string;
    name: string;
    images: { url: string; width: number; height: number }[];
  };
  durationMs: number;
  addedAt: number; // Unix timestamp in ms
}

// Session history
export interface SessionHistory {
  tracks: QueueTrack[];
  sessionId: string;
}
