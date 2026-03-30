---
phase: 1
plan: 2
title: Spotify OAuth PKCE Authentication
wave: 2
depends_on: [1]
files_modified:
  - lib/spotify/auth.ts
  - lib/stores/auth-store.ts
  - app/api/auth/callback/spotify/route.ts
  - app/page.tsx
  - components/auth/login-button.tsx
  - components/auth/auth-provider.tsx
requirements_addressed: [AUTH-01]
autonomous: true
---

<objective>
Implement Spotify OAuth 2.0 PKCE authentication flow with singleton token management and proactive refresh at 50 minutes.

Purpose: Users can authenticate with Spotify and maintain persistent sessions without server secrets.
Output: Working login flow, token storage, automatic refresh, and logout functionality.
</objective>

<must_haves>
- Login button triggers Spotify OAuth PKCE flow
- Callback route handles token exchange
- Tokens stored in localStorage (PKCE is browser-safe, no httpOnly needed)
- Singleton token manager prevents race conditions during refresh
- Proactive refresh at 50 minutes (before 60-minute expiry)
- Logout clears all session data
- Auth state persists across page reloads
</must_haves>

<task id="1">
<title>Create Spotify Auth Module with PKCE Flow</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/client.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/types.ts
</read_first>
<action>
Create lib/spotify/auth.ts implementing PKCE OAuth:

```typescript
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

// Generate PKCE code verifier and challenge
export function generatePKCECodes(): { verifier: string; challenge: string } {
  // Generate random verifier (43-128 chars)
  const verifier = generateRandomString(64);
  // Store verifier for callback
  sessionStorage.setItem("spotify-pkce-verifier", verifier);
  // Generate challenge from verifier
  const challenge = generateCodeChallenge(verifier);
  return { verifier, challenge };
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
```

Update lib/spotify/index.ts to export auth:
```typescript
export * from "./types";
export * from "./client";
export * from "./auth";
```
</action>
<acceptance_criteria>
- `lib/spotify/auth.ts` contains `const SCOPES = [`
- `lib/spotify/auth.ts` contains `const STORAGE_KEY = "vibe-dj-spotify-auth"`
- `lib/spotify/auth.ts` contains `let isRefreshing = false` (singleton pattern)
- `lib/spotify/auth.ts` contains `export async function buildAuthUrl()`
- `lib/spotify/auth.ts` contains `export async function exchangeCodeForTokens(`
- `lib/spotify/auth.ts` contains `export async function refreshTokens()`
- `lib/spotify/auth.ts` contains `export async function ensureValidToken()`
- `lib/spotify/auth.ts` contains `export function logout()`
- TypeScript compiles: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<task id="2">
<title>Create Zustand Auth Store</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/auth.ts (after task 1)
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/types.ts
</read_first>
<action>
Create lib/stores/auth-store.ts:

```typescript
// Auth state store using Zustand
// Manages authentication state and coordinates with Spotify auth module

import { create } from "zustand";
import { TokenState } from "@/lib/spotify/types";
import {
  loadTokens,
  logout as spotifyLogout,
  ensureValidToken,
  buildAuthUrl,
} from "@/lib/spotify/auth";

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string; displayName: string } | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => void;
  setUser: (user: AuthState["user"]) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,

  // Initialize auth state on app load
  initialize: async () => {
    set({ isLoading: true, error: null });

    try {
      const hasValidToken = await ensureValidToken();
      set({
        isAuthenticated: hasValidToken,
        isLoading: false,
      });
    } catch (error) {
      set({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Auth initialization failed",
      });
    }
  },

  // Start OAuth login flow
  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const authUrl = await buildAuthUrl();
      // Redirect to Spotify OAuth
      window.location.href = authUrl;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
    }
  },

  // Logout and clear state
  logout: () => {
    spotifyLogout();
    set({
      isAuthenticated: false,
      user: null,
      error: null,
    });
  },

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
}));
```

Create lib/stores/index.ts (barrel export):
```typescript
export { useAuthStore } from "./auth-store";
```
</action>
<acceptance_criteria>
- `lib/stores/auth-store.ts` contains `export const useAuthStore = create<AuthState>`
- `lib/stores/auth-store.ts` contains `isAuthenticated: boolean`
- `lib/stores/auth-store.ts` contains `initialize: async ()`
- `lib/stores/auth-store.ts` contains `login: async ()`
- `lib/stores/auth-store.ts` contains `logout: () =>`
- `lib/stores/index.ts` contains `export { useAuthStore }`
- TypeScript compiles: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<task id="3">
<title>Create OAuth Callback Route</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/auth.ts
</read_first>
<action>
Create app/api/auth/callback/spotify/route.ts:

```typescript
// OAuth callback handler for Spotify PKCE flow
// Exchanges code for tokens and redirects to app

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Handle OAuth errors
  if (error) {
    console.error("Spotify OAuth error:", error);
    return NextResponse.redirect(
      `${appUrl}?error=${encodeURIComponent(error)}`
    );
  }

  // Validate code exists
  if (!code) {
    return NextResponse.redirect(
      `${appUrl}?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  // Token exchange happens client-side (PKCE flow)
  // We just redirect with the code - client will exchange it
  return NextResponse.redirect(
    `${appUrl}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || "")}`
  );
}
```

Note: Token exchange happens client-side in the AuthProvider because PKCE is browser-safe and the code_verifier is stored in sessionStorage.
</action>
<acceptance_criteria>
- `app/api/auth/callback/spotify/route.ts` exists
- File contains `export async function GET(request: NextRequest)`
- File contains `const code = searchParams.get("code")`
- File contains `if (error)` error handling
- File contains `NextResponse.redirect`
</acceptance_criteria>
</task>

<task id="4">
<title>Create AuthProvider Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/auth-store.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/auth.ts
</read_first>
<action>
Create components/auth/auth-provider.tsx:

```typescript
"use client";

// AuthProvider - Handles auth initialization and OAuth callback processing
// Wrap app in this to enable authentication

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";
import { getSpotifyClient } from "@/lib/spotify/client";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { initialize, setUser, setError } = useAuthStore();
  const initialized = useRef(false);

  // Handle OAuth callback and initialize auth
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function handleAuth() {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      // Handle OAuth error
      if (error) {
        setError(error);
        // Clear URL params
        router.replace("/", { scroll: false });
        return;
      }

      // Handle OAuth callback with code
      if (code) {
        try {
          await exchangeCodeForTokens(code);
          // Fetch user profile after successful auth
          await fetchUserProfile();
          // Clear URL params
          router.replace("/", { scroll: false });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Authentication failed");
          router.replace("/", { scroll: false });
        }
        return;
      }

      // No code - just initialize from stored tokens
      await initialize();

      // If authenticated, fetch user profile
      const client = getSpotifyClient();
      if (client) {
        await fetchUserProfile();
      }
    }

    handleAuth();
  }, [searchParams, router, initialize, setError]);

  async function fetchUserProfile() {
    const client = getSpotifyClient();
    if (!client) return;

    try {
      const profile = await client.currentUser.profile();
      setUser({
        id: profile.id,
        email: profile.email || "",
        displayName: profile.display_name || profile.id,
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  }

  return <>{children}</>;
}
```

Create components/auth/index.ts (barrel export):
```typescript
export { AuthProvider } from "./auth-provider";
```
</action>
<acceptance_criteria>
- `components/auth/auth-provider.tsx` contains `"use client"`
- `components/auth/auth-provider.tsx` contains `export function AuthProvider`
- `components/auth/auth-provider.tsx` contains `const code = searchParams.get("code")`
- `components/auth/auth-provider.tsx` contains `await exchangeCodeForTokens(code)`
- `components/auth/auth-provider.tsx` contains `await fetchUserProfile()`
- `components/auth/index.ts` contains `export { AuthProvider }`
</acceptance_criteria>
</task>

<task id="5">
<title>Create Login Button Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/auth-store.ts
</read_first>
<action>
Create components/auth/login-button.tsx:

```typescript
"use client";

// Login button - Triggers Spotify OAuth flow

import { useAuthStore } from "@/lib/stores/auth-store";

export function LoginButton() {
  const { login, isLoading, error } = useAuthStore();

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={() => login()}
        disabled={isLoading}
        className="flex items-center gap-2 px-6 py-3 bg-[#1DB954] hover:bg-[#1ed760] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-full transition-colors"
      >
        {isLoading ? (
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
          </svg>
        )}
        Connect with Spotify
      </button>
      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
```

Create components/auth/logout-button.tsx:

```typescript
"use client";

// Logout button - Clears auth state

import { useAuthStore } from "@/lib/stores/auth-store";

export function LogoutButton() {
  const { logout, user } = useAuthStore();

  return (
    <button
      onClick={() => logout()}
      className="px-4 py-2 text-sm text-foreground/70 hover:text-foreground transition-colors"
    >
      Sign out {user?.displayName && `(${user.displayName})`}
    </button>
  );
}
```

Update components/auth/index.ts:
```typescript
export { AuthProvider } from "./auth-provider";
export { LoginButton } from "./login-button";
export { LogoutButton } from "./logout-button";
```
</action>
<acceptance_criteria>
- `components/auth/login-button.tsx` contains `"use client"`
- `components/auth/login-button.tsx` contains `export function LoginButton()`
- `components/auth/login-button.tsx` contains `onClick={() => login()}`
- `components/auth/login-button.tsx` contains `bg-[#1DB954]` (Spotify green)
- `components/auth/logout-button.tsx` contains `export function LogoutButton()`
- `components/auth/logout-button.tsx` contains `onClick={() => logout()}`
- `components/auth/index.ts` contains `export { LoginButton }`
</acceptance_criteria>
</task>

<task id="6">
<title>Integrate Auth into App Layout and Page</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/layout.tsx
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/page.tsx
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/components/auth/auth-provider.tsx
</read_first>
<action>
Update app/layout.tsx to wrap with AuthProvider:

```typescript
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { AuthProvider } from "@/components/auth";

export const metadata: Metadata = {
  title: "Vibe DJ",
  description: "AI music curator - describe a vibe, hear it immediately",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans">
        <main className="flex min-h-screen flex-col">
          <Suspense fallback={null}>
            <AuthProvider>
              {children}
            </AuthProvider>
          </Suspense>
        </main>
      </body>
    </html>
  );
}
```

Update app/page.tsx to show login or authenticated state:

```typescript
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginButton, LogoutButton } from "@/components/auth";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
          <p className="text-foreground/70">
            Connect to Spotify to get started
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Authenticated - show placeholder for next phase
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4 border-b border-surface">
        <h1 className="text-xl font-display text-primary">Vibe DJ</h1>
        <LogoutButton />
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl">Welcome, {user?.displayName || "DJ"}!</p>
          <p className="text-foreground/70">
            Spotify connected. Device selection coming in Plan 03.
          </p>
        </div>
      </div>
    </div>
  );
}
```
</action>
<acceptance_criteria>
- `app/layout.tsx` contains `import { AuthProvider } from "@/components/auth"`
- `app/layout.tsx` contains `<AuthProvider>`
- `app/layout.tsx` contains `<Suspense fallback={null}>` (required for useSearchParams)
- `app/page.tsx` contains `"use client"`
- `app/page.tsx` contains `const { isAuthenticated, isLoading, user } = useAuthStore()`
- `app/page.tsx` contains `<LoginButton />`
- `app/page.tsx` contains `<LogoutButton />`
- `npm run build` completes without errors
</acceptance_criteria>
</task>

<verification>
Test the full OAuth flow:

```bash
# 1. Build succeeds
npm run build

# 2. TypeScript compiles
npx tsc --noEmit

# 3. Manual test:
# a. npm run dev
# b. Visit http://localhost:3000
# c. Click "Connect with Spotify"
# d. Authorize in Spotify
# e. Redirected back with logged-in state
# f. Page shows "Welcome, [name]!"
# g. Click "Sign out" - returns to login screen
# h. Refresh page - should stay logged out
# i. Login again, refresh page - should stay logged in (token persisted)
```

Verify token refresh (requires waiting or manual testing):
- Tokens stored in localStorage under key "vibe-dj-spotify-auth"
- expiresAt timestamp is set ~60 minutes in future
- shouldRefreshToken returns true when within 10 minutes of expiry
</verification>
