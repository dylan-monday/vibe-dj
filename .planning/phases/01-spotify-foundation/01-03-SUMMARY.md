---
phase: 1
plan: 3
subsystem: spotify-foundation
tags: [devices, playback, error-handling, ui]
dependencies:
  requires: [01-02]
  provides: [device-selection, playback-transfer, error-recovery]
  affects: [ui, spotify-api]
tech_stack:
  added: []
  patterns: [exponential-backoff, optimistic-ui, error-recovery]
key_files:
  created:
    - lib/spotify/devices.ts
    - lib/stores/playback-store.ts
    - components/player/device-picker.tsx
    - components/player/index.ts
    - lib/hooks/use-spotify-error-handler.ts
    - lib/hooks/index.ts
  modified:
    - lib/spotify/index.ts
    - lib/spotify/types.ts
    - lib/stores/index.ts
    - app/page.tsx
decisions:
  - Removed supports_volume from SpotifyDevice to match SDK Device type
  - Exponential backoff maxes at 32 seconds for 429 rate limits
  - Optimistic UI update for device selection (update state before confirmation)
  - Error recovery hook provides action type for UI decisions
metrics:
  duration_minutes: 4
  completed_date: "2026-03-30T23:40:11Z"
  tasks_completed: 5
  files_changed: 10
  commits: 5
---

# Phase 1 Plan 3: Device Selection and Playback Transfer Summary

**One-liner:** Spotify Connect device picker with exponential backoff rate limiting, automatic 401 token refresh, and optimistic UI updates for device transfer.

## What Was Built

Implemented complete device selection and playback transfer system with comprehensive error recovery:

1. **Devices API Module** (`lib/spotify/devices.ts`)
   - `getDevices()` - Fetch available Spotify Connect devices
   - `transferPlayback()` - Transfer playback to selected device
   - `getActiveDevice()` - Get currently active device
   - `isSonosDevice()` - Detect Sonos speakers
   - `getDeviceIcon()` - Map device types to icons
   - `SpotifyApiError` - Custom error class with status codes and retry timing
   - `withErrorHandling()` - Wrapper with automatic retry/refresh logic

2. **Playback Store** (`lib/stores/playback-store.ts`)
   - Zustand store managing device state
   - `fetchDevices` action with error handling
   - `selectDevice` action with optimistic UI update
   - Placeholder for Phase 2 playback state

3. **Device Picker Component** (`components/player/device-picker.tsx`)
   - Lists all available Spotify Connect devices
   - Device type icons (laptop, phone, speaker, TV, car)
   - Sonos badge for detected Sonos devices
   - Active device highlight with primary color
   - Loading, error, and no-devices states
   - Refresh button in header

4. **Error Recovery Hook** (`lib/hooks/use-spotify-error-handler.ts`)
   - Centralized error handling logic
   - Maps status codes to UI actions (retry/reauth/wait/none)
   - 401 → logout and force re-auth
   - 429 → return retryAfter timing
   - 204 → no active device message
   - 5xx → retry action

5. **Main Page Integration** (`app/page.tsx`)
   - Device picker displayed after authentication
   - Shows active device name in welcome message
   - Phase 2 placeholder message when device selected

## Error Recovery Implementation

### Automatic Token Refresh (401)
- `withErrorHandling()` catches 401 errors
- Calls `refreshTokens()` from auth module
- Retries operation once with new token
- Throws `SpotifyApiError` if refresh fails

### Rate Limit Backoff (429)
- Exponential backoff starting at 1000ms
- Doubles on each retry, max 32000ms
- Reads `Retry-After` header if present
- Retries up to 3 times before throwing

### Server Error Retry (5xx)
- Retries 500, 502, 503 errors up to 2 times
- Uses exponential backoff
- Throws `SpotifyApiError` after exhausting retries

### No Active Device (204)
- Treated as expected state, not error
- Throws `SpotifyApiError` with 204 code
- UI displays helpful message

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SpotifyDevice type mismatch**
- **Found during:** Task 1 TypeScript compilation
- **Issue:** Plan specified `supports_volume: boolean` field, but Spotify SDK's Device type doesn't include this field
- **Fix:** Removed `supports_volume` from SpotifyDevice interface and device mapping
- **Files modified:** lib/spotify/types.ts, lib/spotify/devices.ts
- **Commit:** 1b5821c

## Known Stubs

None - all features fully wired to Spotify API.

## Verification Results

### Build Verification
- ✅ `npm run build` - Successful
- ✅ `npx tsc --noEmit` - No errors
- ✅ 401 error handling: line 47 in devices.ts
- ✅ 429 error handling: line 59 in devices.ts
- ✅ MAX_BACKOFF_MS: line 22 in devices.ts

### Manual Testing Checklist
- Login with Spotify → Device picker appears
- Open Spotify on another device → Refresh shows new device
- Click device → Shows "Active" badge
- Active device name appears in welcome message
- Close Spotify app → Refresh handles gracefully
- No devices → Shows helpful message with refresh button
- Network error → Retry button works

## Phase 1 Success Criteria

✅ **User can log in via Spotify OAuth (PKCE flow)** - Plan 02
✅ **User can select Sonos speaker from device list** - This plan
✅ **User can transfer playback between devices** - This plan
✅ **Expired tokens refresh automatically** - Plan 02 + devices.ts withErrorHandling
✅ **Token refresh race conditions handled** - auth.ts singleton pattern

## Next Steps

Phase 1 is now complete! All three plans (project scaffold, Spotify OAuth, device selection) have been executed successfully.

**Ready for Phase 2:** Now Playing UI
- Poll Spotify playback state every 3-5 seconds
- Display album art, track info, progress bar
- Implement play/pause/skip controls
- Sync UI to actual Spotify state

## Self-Check: PASSED

**Created files exist:**
- ✅ lib/spotify/devices.ts
- ✅ lib/stores/playback-store.ts
- ✅ components/player/device-picker.tsx
- ✅ components/player/index.ts
- ✅ lib/hooks/use-spotify-error-handler.ts
- ✅ lib/hooks/index.ts

**Commits exist:**
- ✅ 1b5821c (Task 1: Devices API)
- ✅ 11518b0 (Task 2: Playback Store)
- ✅ f803f51 (Task 3: Device Picker)
- ✅ 0ac07f1 (Task 4: Main Page Integration)
- ✅ 93563f3 (Task 5: Error Recovery Hook)

All files and commits verified successfully.
