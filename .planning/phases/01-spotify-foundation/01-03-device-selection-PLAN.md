---
phase: 1
plan: 3
title: Device Selection and Playback Transfer
wave: 3
depends_on: [2]
files_modified:
  - lib/spotify/devices.ts
  - lib/stores/playback-store.ts
  - components/player/device-picker.tsx
  - app/page.tsx
requirements_addressed: [AUTH-02, UI-03]
autonomous: true
---

<objective>
Implement Spotify Connect device selection, playback transfer, and error recovery mechanisms including automatic token refresh and graceful handling of 401/429/5xx errors.

Purpose: Users can select Sonos speakers from device list and transfer playback between devices without errors.
Output: Device picker UI, playback transfer API, comprehensive error recovery.
</objective>

<must_haves>
- Displays list of available Spotify Connect devices
- Shows device type icons (speaker, phone, computer)
- Indicates currently active device
- User can transfer playback to selected device
- Handles "no active device" state gracefully
- 401 errors trigger automatic token refresh
- 429 errors use exponential backoff
- 5xx errors show retry options
- Device disconnection prompts re-selection
</must_haves>

<task id="1">
<title>Create Devices API Module</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/client.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/types.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/auth.ts
</read_first>
<action>
Create lib/spotify/devices.ts:

```typescript
// Spotify Connect device management
// Handles device listing, selection, and playback transfer

import { getSpotifyClient } from "./client";
import { SpotifyDevice } from "./types";
import { ensureValidToken, refreshTokens } from "./auth";

// Error types for caller handling
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

// Exponential backoff state
let backoffMs = 1000;
const MAX_BACKOFF_MS = 32000;

function resetBackoff() {
  backoffMs = 1000;
}

function getNextBackoff(): number {
  const current = backoffMs;
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  return current;
}

// Wrapper for API calls with error handling
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    const result = await operation();
    resetBackoff();
    return result;
  } catch (error: unknown) {
    // Handle 401 - token expired
    if (isSpotifyError(error, 401)) {
      if (retryCount < 1) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          return withErrorHandling(operation, retryCount + 1);
        }
      }
      throw new SpotifyApiError("Authentication expired. Please log in again.", 401);
    }

    // Handle 429 - rate limited
    if (isSpotifyError(error, 429)) {
      const retryAfter = getRetryAfter(error) || getNextBackoff();
      if (retryCount < 3) {
        await sleep(retryAfter);
        return withErrorHandling(operation, retryCount + 1);
      }
      throw new SpotifyApiError(
        "Rate limited. Please wait before trying again.",
        429,
        retryAfter
      );
    }

    // Handle 5xx - server errors
    if (isSpotifyError(error, 500) || isSpotifyError(error, 502) || isSpotifyError(error, 503)) {
      if (retryCount < 2) {
        await sleep(getNextBackoff());
        return withErrorHandling(operation, retryCount + 1);
      }
      throw new SpotifyApiError(
        "Spotify is temporarily unavailable. Please try again.",
        (error as { status?: number }).status || 500
      );
    }

    // Handle 204 - no active device
    if (isSpotifyError(error, 204)) {
      throw new SpotifyApiError("No active playback device", 204);
    }

    // Re-throw unknown errors
    throw error;
  }
}

function isSpotifyError(error: unknown, statusCode: number): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    (error as { status: number }).status === statusCode
  );
}

function getRetryAfter(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "headers" in error &&
    typeof (error as { headers: unknown }).headers === "object"
  ) {
    const headers = (error as { headers: Record<string, string> }).headers;
    const retryAfter = headers["retry-after"];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get available devices
export async function getDevices(): Promise<SpotifyDevice[]> {
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
      supports_volume: device.supports_volume,
    }));
  });
}

// Transfer playback to device
export async function transferPlayback(
  deviceId: string,
  startPlaying = false
): Promise<void> {
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
```

Update lib/spotify/index.ts:
```typescript
export * from "./types";
export * from "./client";
export * from "./auth";
export * from "./devices";
```
</action>
<acceptance_criteria>
- `lib/spotify/devices.ts` contains `export class SpotifyApiError extends Error`
- `lib/spotify/devices.ts` contains `async function withErrorHandling<T>`
- `lib/spotify/devices.ts` contains `if (isSpotifyError(error, 401))` (401 handling)
- `lib/spotify/devices.ts` contains `if (isSpotifyError(error, 429))` (429 handling)
- `lib/spotify/devices.ts` contains `if (isSpotifyError(error, 500)` (5xx handling)
- `lib/spotify/devices.ts` contains `export async function getDevices()`
- `lib/spotify/devices.ts` contains `export async function transferPlayback(`
- `lib/spotify/devices.ts` contains `export function isSonosDevice(`
- `lib/spotify/devices.ts` contains `const MAX_BACKOFF_MS = 32000`
- TypeScript compiles: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<task id="2">
<title>Create Playback Store with Device State</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/auth-store.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/devices.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/types.ts
</read_first>
<action>
Create lib/stores/playback-store.ts:

```typescript
// Playback state store using Zustand
// Manages device selection and playback state

import { create } from "zustand";
import { SpotifyDevice, PlaybackState } from "@/lib/spotify/types";
import {
  getDevices,
  transferPlayback,
  SpotifyApiError,
} from "@/lib/spotify/devices";

interface PlaybackStore {
  // Device state
  devices: SpotifyDevice[];
  activeDevice: SpotifyDevice | null;
  isLoadingDevices: boolean;
  deviceError: string | null;

  // Playback state (to be expanded in Phase 2)
  playbackState: PlaybackState | null;
  isPolling: boolean;

  // Actions
  fetchDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  clearDeviceError: () => void;
  setPlaybackState: (state: PlaybackState | null) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Initial state
  devices: [],
  activeDevice: null,
  isLoadingDevices: false,
  deviceError: null,
  playbackState: null,
  isPolling: false,

  // Fetch available devices
  fetchDevices: async () => {
    set({ isLoadingDevices: true, deviceError: null });

    try {
      const devices = await getDevices();
      const active = devices.find((d) => d.is_active) || null;

      set({
        devices,
        activeDevice: active,
        isLoadingDevices: false,
      });
    } catch (error) {
      const message =
        error instanceof SpotifyApiError
          ? error.message
          : "Failed to fetch devices";

      set({
        isLoadingDevices: false,
        deviceError: message,
      });
    }
  },

  // Select and transfer playback to device
  selectDevice: async (deviceId: string) => {
    const { devices } = get();
    const device = devices.find((d) => d.id === deviceId);

    if (!device) {
      set({ deviceError: "Device not found" });
      return;
    }

    set({ isLoadingDevices: true, deviceError: null });

    try {
      await transferPlayback(deviceId, false);

      // Update active device optimistically
      set({
        activeDevice: device,
        devices: devices.map((d) => ({
          ...d,
          is_active: d.id === deviceId,
        })),
        isLoadingDevices: false,
      });
    } catch (error) {
      const message =
        error instanceof SpotifyApiError
          ? error.message
          : "Failed to transfer playback";

      set({
        isLoadingDevices: false,
        deviceError: message,
      });
    }
  },

  clearDeviceError: () => set({ deviceError: null }),
  setPlaybackState: (state) => set({ playbackState: state }),
}));
```

Update lib/stores/index.ts:
```typescript
export { useAuthStore } from "./auth-store";
export { usePlaybackStore } from "./playback-store";
```
</action>
<acceptance_criteria>
- `lib/stores/playback-store.ts` contains `export const usePlaybackStore = create<PlaybackStore>`
- `lib/stores/playback-store.ts` contains `devices: SpotifyDevice[]`
- `lib/stores/playback-store.ts` contains `activeDevice: SpotifyDevice | null`
- `lib/stores/playback-store.ts` contains `fetchDevices: async ()`
- `lib/stores/playback-store.ts` contains `selectDevice: async (deviceId: string)`
- `lib/stores/playback-store.ts` contains `error instanceof SpotifyApiError` (error handling)
- `lib/stores/index.ts` contains `export { usePlaybackStore }`
- TypeScript compiles: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<task id="3">
<title>Create Device Picker Component</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/playback-store.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/devices.ts
</read_first>
<action>
Create components/player/device-picker.tsx:

```typescript
"use client";

// Device picker - Shows available Spotify Connect devices
// Allows user to select playback target (e.g., Sonos speakers)

import { useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { getDeviceIcon, isSonosDevice } from "@/lib/spotify/devices";

export function DevicePicker() {
  const {
    devices,
    activeDevice,
    isLoadingDevices,
    deviceError,
    fetchDevices,
    selectDevice,
    clearDeviceError,
  } = usePlaybackStore();

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Device icon component
  const DeviceIcon = ({ type }: { type: string }) => {
    const icon = getDeviceIcon(type);
    return (
      <span className="text-lg" aria-hidden>
        {icon === "laptop" && "💻"}
        {icon === "smartphone" && "📱"}
        {icon === "speaker" && "🔊"}
        {icon === "tv" && "📺"}
        {icon === "car" && "🚗"}
        {icon === "device" && "🎵"}
      </span>
    );
  };

  // Loading state
  if (isLoadingDevices && devices.length === 0) {
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-foreground/70">Finding devices...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (deviceError) {
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-2">
          <p className="text-red-400">{deviceError}</p>
          <button
            onClick={() => {
              clearDeviceError();
              fetchDevices();
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No devices found
  if (devices.length === 0) {
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-3">
          <p className="text-foreground/70">No devices found</p>
          <p className="text-sm text-foreground/50">
            Open Spotify on a device to make it available
          </p>
          <button
            onClick={() => fetchDevices()}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface text-foreground rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <div className="p-3 border-b border-surface-elevated flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Select Device</h3>
        <button
          onClick={() => fetchDevices()}
          disabled={isLoadingDevices}
          className="p-1 text-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Refresh devices"
        >
          <svg
            className={`w-4 h-4 ${isLoadingDevices ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      <ul className="divide-y divide-surface-elevated">
        {devices.map((device) => (
          <li key={device.id}>
            <button
              onClick={() => device.id && selectDevice(device.id)}
              disabled={!device.id || device.is_active || isLoadingDevices}
              className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                device.is_active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-surface-elevated"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <DeviceIcon type={device.type} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {device.name}
                  {isSonosDevice(device) && (
                    <span className="ml-2 text-xs text-accent-cyan">Sonos</span>
                  )}
                </p>
                <p className="text-xs text-foreground/50 capitalize">
                  {device.type}
                  {device.volume_percent !== null &&
                    ` • ${device.volume_percent}%`}
                </p>
              </div>
              {device.is_active && (
                <span className="text-xs text-primary font-medium">Active</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

Create components/player/index.ts:
```typescript
export { DevicePicker } from "./device-picker";
```
</action>
<acceptance_criteria>
- `components/player/device-picker.tsx` contains `"use client"`
- `components/player/device-picker.tsx` contains `export function DevicePicker()`
- `components/player/device-picker.tsx` contains `usePlaybackStore()`
- `components/player/device-picker.tsx` contains `useEffect(() => { fetchDevices(); }`
- `components/player/device-picker.tsx` contains `onClick={() => device.id && selectDevice(device.id)`
- `components/player/device-picker.tsx` contains `isSonosDevice(device)` (Sonos detection)
- `components/player/device-picker.tsx` contains error retry button with `onClick`
- `components/player/index.ts` contains `export { DevicePicker }`
</acceptance_criteria>
</task>

<task id="4">
<title>Integrate Device Picker into Main Page</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/page.tsx
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/components/player/device-picker.tsx
</read_first>
<action>
Update app/page.tsx to show device picker when authenticated:

```typescript
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { LoginButton, LogoutButton } from "@/components/auth";
import { DevicePicker } from "@/components/player";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { activeDevice } = usePlaybackStore();

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

  // Authenticated - show device picker
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4 border-b border-surface">
        <h1 className="text-xl font-display text-primary">Vibe DJ</h1>
        <LogoutButton />
      </header>

      <div className="flex-1 p-4 space-y-6">
        {/* Welcome message */}
        <div className="text-center">
          <p className="text-2xl">Welcome, {user?.displayName || "DJ"}!</p>
          {activeDevice ? (
            <p className="text-foreground/70">
              Playing on {activeDevice.name}
            </p>
          ) : (
            <p className="text-foreground/70">
              Select a device to start playing
            </p>
          )}
        </div>

        {/* Device picker */}
        <div className="max-w-md mx-auto">
          <DevicePicker />
        </div>

        {/* Status message for Phase 2 */}
        {activeDevice && (
          <div className="text-center text-foreground/50 text-sm">
            <p>Phase 1 complete. Playback controls coming in Phase 2.</p>
          </div>
        )}
      </div>
    </div>
  );
}
```
</action>
<acceptance_criteria>
- `app/page.tsx` contains `import { usePlaybackStore } from "@/lib/stores/playback-store"`
- `app/page.tsx` contains `import { DevicePicker } from "@/components/player"`
- `app/page.tsx` contains `const { activeDevice } = usePlaybackStore()`
- `app/page.tsx` contains `<DevicePicker />`
- `app/page.tsx` contains `Playing on {activeDevice.name}` (shows active device)
- `npm run build` completes without errors
</acceptance_criteria>
</task>

<task id="5">
<title>Add Error Recovery Hooks</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/devices.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/auth-store.ts
</read_first>
<action>
Create lib/hooks/use-spotify-error-handler.ts:

```typescript
"use client";

// Hook for handling Spotify API errors consistently across components
// Implements UI-03 error recovery requirements

import { useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SpotifyApiError } from "@/lib/spotify/devices";

interface ErrorHandler {
  handleError: (error: unknown) => {
    message: string;
    action: "retry" | "reauth" | "wait" | "none";
    retryAfter?: number;
  };
}

export function useSpotifyErrorHandler(): ErrorHandler {
  const { logout } = useAuthStore();

  const handleError = useCallback(
    (error: unknown) => {
      // Handle SpotifyApiError with known status codes
      if (error instanceof SpotifyApiError) {
        switch (error.statusCode) {
          case 401:
            // Token expired and couldn't refresh - force re-auth
            logout();
            return {
              message: "Session expired. Please log in again.",
              action: "reauth" as const,
            };

          case 429:
            return {
              message: "Too many requests. Please wait a moment.",
              action: "wait" as const,
              retryAfter: error.retryAfter || 5000,
            };

          case 204:
            return {
              message: "No active device. Open Spotify on a device first.",
              action: "none" as const,
            };

          case 500:
          case 502:
          case 503:
            return {
              message: "Spotify is temporarily unavailable.",
              action: "retry" as const,
            };

          default:
            return {
              message: error.message,
              action: "retry" as const,
            };
        }
      }

      // Handle generic errors
      return {
        message: error instanceof Error ? error.message : "An error occurred",
        action: "retry" as const,
      };
    },
    [logout]
  );

  return { handleError };
}
```

Create lib/hooks/index.ts:
```typescript
export { useSpotifyErrorHandler } from "./use-spotify-error-handler";
```
</action>
<acceptance_criteria>
- `lib/hooks/use-spotify-error-handler.ts` contains `"use client"`
- `lib/hooks/use-spotify-error-handler.ts` contains `export function useSpotifyErrorHandler()`
- `lib/hooks/use-spotify-error-handler.ts` contains `case 401:` with `logout()`
- `lib/hooks/use-spotify-error-handler.ts` contains `case 429:` with `retryAfter`
- `lib/hooks/use-spotify-error-handler.ts` contains `case 204:` (no active device)
- `lib/hooks/use-spotify-error-handler.ts` contains `case 500:` / `502:` / `503:`
- `lib/hooks/index.ts` contains `export { useSpotifyErrorHandler }`
- TypeScript compiles: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<verification>
Test device selection and error recovery:

```bash
# 1. Build succeeds
npm run build

# 2. TypeScript compiles
npx tsc --noEmit

# 3. Manual testing checklist:
# a. npm run dev
# b. Login with Spotify
# c. Device picker should appear
# d. Open Spotify on another device (phone, desktop)
# e. Refresh devices - new device should appear
# f. Click a device - should show "Active" badge
# g. Active device name should appear in welcome message
# h. Close Spotify app - refresh devices - should handle gracefully
# i. Test error states:
#    - With no devices: "No devices found" message with refresh button
#    - Network error: Retry button should work

# 4. Verify error handling code exists:
grep -n "case 401:" lib/spotify/devices.ts
grep -n "case 429:" lib/spotify/devices.ts
grep -n "MAX_BACKOFF_MS" lib/spotify/devices.ts
```

Phase 1 Success Criteria verification:
1. User can log in via Spotify OAuth (PKCE flow) - Plan 02
2. User can select Sonos speaker from device list - This plan
3. User can transfer playback between devices - This plan
4. Expired tokens refresh automatically - Plan 02 + devices.ts withErrorHandling
5. Token refresh race conditions handled - auth.ts singleton pattern
</verification>
