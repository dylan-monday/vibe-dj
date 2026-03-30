// Spotify PKCE OAuth implementation
// Using @spotify/web-api-ts-sdk's built-in PKCE support

import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { TokenState } from "./types";
import { setSpotifyClient, clearSpotifyClient, shouldRefreshToken } from "./client";

// Scopes needed for Phase 1 (playback control + devices)
const SCOPES = [
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "user-read-email",
  "user-read-private",
];

const STORAGE_KEY = "vibe-dj-spotify-auth";

// Singleton refresh state to prevent race conditions
let isRefreshing = false;
let refreshPromise: Promise<TokenState | null> | null = null;

// Get client ID from environment
function getClientId(): string {
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_SPOTIFY_CLIENT_ID not configured");
  }
  return clientId;
}

// Get redirect URI from environment
function getRedirectUri(): string {
  return process.env.SPOTIFY_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/spotify`;
}

function generateRandomString(length: number): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values)
    .map((x) => possible[x % possible.length])
    .join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Build authorization URL for PKCE flow
export async function buildAuthUrl(): Promise<string> {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  const verifier = generateRandomString(64);

  // Store verifier for callback
  sessionStorage.setItem("spotify-pkce-verifier", verifier);

  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: challenge,
    state: generateRandomString(16),
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(code: string): Promise<TokenState> {
  const clientId = getClientId();
  const redirectUri = getRedirectUri();
  const verifier = sessionStorage.getItem("spotify-pkce-verifier");

  if (!verifier) {
    throw new Error("PKCE verifier not found - auth flow corrupted");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Token exchange failed: ${error.error_description || error.error}`);
  }

  const data = await response.json();

  // Clear verifier after successful exchange
  sessionStorage.removeItem("spotify-pkce-verifier");

  const tokenState: TokenState = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  // Persist tokens
  saveTokens(tokenState);

  // Initialize SDK client
  initializeSpotifyClient(tokenState);

  return tokenState;
}

// Refresh tokens using refresh_token grant
export async function refreshTokens(): Promise<TokenState | null> {
  // Singleton pattern: if already refreshing, return existing promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const stored = loadTokens();
  if (!stored?.refreshToken) {
    return null;
  }

  isRefreshing = true;
  refreshPromise = doRefresh(stored.refreshToken);

  try {
    const result = await refreshPromise;
    return result;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

async function doRefresh(refreshToken: string): Promise<TokenState | null> {
  const clientId = getClientId();

  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      // Refresh failed - clear tokens and require re-auth
      clearTokens();
      return null;
    }

    const data = await response.json();

    const tokenState: TokenState = {
      accessToken: data.access_token,
      // Spotify may return a new refresh token
      refreshToken: data.refresh_token || refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    saveTokens(tokenState);
    initializeSpotifyClient(tokenState);

    return tokenState;
  } catch (error) {
    console.error("Token refresh failed:", error);
    clearTokens();
    return null;
  }
}

// Storage helpers
export function saveTokens(state: TokenState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function loadTokens(): TokenState | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as TokenState;
  } catch {
    return null;
  }
}

export function clearTokens(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    clearSpotifyClient();
  }
}

// Initialize SpotifyApi client from tokens
function initializeSpotifyClient(tokens: TokenState): void {
  const client = SpotifyApi.withAccessToken(getClientId(), {
    access_token: tokens.accessToken,
    token_type: "Bearer",
    expires_in: Math.floor((tokens.expiresAt - Date.now()) / 1000),
    refresh_token: tokens.refreshToken,
  });
  setSpotifyClient(client);
}

// Check and proactively refresh if needed (call on app init and before API calls)
export async function ensureValidToken(): Promise<boolean> {
  const tokens = loadTokens();
  if (!tokens) return false;

  if (shouldRefreshToken(tokens.expiresAt)) {
    const refreshed = await refreshTokens();
    return refreshed !== null;
  }

  // Token still valid, ensure client is initialized
  initializeSpotifyClient(tokens);
  return true;
}

// Logout - clear everything
export function logout(): void {
  clearTokens();
  sessionStorage.removeItem("spotify-pkce-verifier");
}
