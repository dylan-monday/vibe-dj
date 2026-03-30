// Singleton Spotify client wrapper
// Handles PKCE auth flow and token refresh per CLAUDE.md architecture

import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// Will be initialized after OAuth callback
let spotifyClient: SpotifyApi | null = null;

// Proactive refresh threshold: 50 minutes (before 60 min expiry)
const REFRESH_THRESHOLD_MS = 50 * 60 * 1000;

export function getSpotifyClient(): SpotifyApi | null {
  return spotifyClient;
}

export function setSpotifyClient(client: SpotifyApi): void {
  spotifyClient = client;
}

export function clearSpotifyClient(): void {
  spotifyClient = null;
}

// Check if token needs refresh (within threshold of expiry)
export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Date.now();
  return expiresAt - now < REFRESH_THRESHOLD_MS;
}
