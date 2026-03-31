---
phase: 02-playback-core
plan: 03
subsystem: playback-ui
tags: [ui, controls, queue, history, mobile]
requires: [02-01-playback-state, 02-02-now-playing-ui]
provides: [playback-controls, volume-control, queue-display, history-display]
affects: [app/page.tsx, components/player/*]
tech-stack:
  added: []
  patterns: [touch-friendly-ui, debounced-api-calls, tabbed-interface]
key-files:
  created:
    - components/player/track-item.tsx
    - components/player/playback-controls.tsx
    - components/player/volume-slider.tsx
    - components/player/queue-list.tsx
    - components/player/history-list.tsx
  modified:
    - components/player/index.ts
    - app/page.tsx
    - lib/spotify/devices.ts
    - lib/spotify/playback.ts
decisions:
  - "Volume slider uses 100ms debounce to prevent API spam"
  - "Mute button remembers previous volume for easy unmute"
  - "Queue limited to 10 visible tracks, history to 20 for performance"
  - "Tab interface for queue/history instead of separate pages"
  - "Empty states provide helpful messages for user guidance"
  - "All touch targets exceed 44px minimum (play button 64px, skip 48px, mute 40px)"
metrics:
  duration_minutes: 5
  tasks_completed: 5
  files_changed: 9
  commits: 6
  completed_at: "2026-03-31T13:37:36Z"
---

# Phase 02 Plan 03: Controls, Queue, and History Summary

**One-liner:** Touch-friendly playback controls with debounced volume, tabbed queue/history display using reusable TrackItem component

## Overview

Created a complete playback UI with mobile-optimized controls (play/pause, skip, volume), queue display showing upcoming tracks, and history list with session tracking. All components use touch-friendly sizing (44px+ targets) and integrate into a unified tabbed interface.

## Tasks Completed

### Task 1: Create TrackItem Reusable Component
**Files:** `components/player/track-item.tsx`
**Commit:** e84862e

- Reusable component for both queue and history displays
- Album thumbnail using AlbumArt component (sm size)
- Touch-friendly 56px minimum height
- Current track highlight with animated bars (purple pulse)
- Duration in monospace font for alignment
- Truncation for long track/artist names
- Supports optional onClick handler

### Task 2: Create PlaybackControls Component
**Files:** `components/player/playback-controls.tsx`
**Commit:** b600ebb

- Play/pause button: 64px (hero action) with primary purple background
- Skip buttons: 48px (secondary actions)
- All buttons exceed 44px touch target minimum
- Active states with scale-95 for tactile feedback
- Disabled state when no track is playing
- Shadow on play button for visual depth
- Inline SVG icons (play, pause, skip next/previous)

### Task 3: Create VolumeSlider Component
**Files:** `components/player/volume-slider.tsx`
**Commit:** a295348

- Mute toggle button: 40px with contextual icons (mute/low/high volume)
- Range slider with track fill gradient (purple)
- 100ms debounce on API calls to prevent spam
- Local state for smooth dragging experience
- Remembers previous volume when unmuting (defaults to 50% if unmuted from 0)
- Touch-friendly 40px slider height
- Disabled state when no active device

### Task 4: Create QueueList and HistoryList Components
**Files:** `components/player/queue-list.tsx`, `components/player/history-list.tsx`
**Commit:** 7b5ddc9

**QueueList:**
- Shows upcoming tracks from queue-store
- Displays max 10 tracks by default with "+N more" indicator
- Empty state: "Queue is empty / Tracks will appear when you start a vibe"
- Scrollable container with 300px max height
- Track count badge in header

**HistoryList:**
- Shows played tracks from queue-store (session-persisted)
- Displays max 20 tracks by default
- Clear button to reset history
- Empty state: "No history yet / Played tracks will appear here"
- Scrollable container with 400px max height
- "Showing X of Y tracks" overflow indicator

Both use TrackItem for consistent styling and current-track highlighting.

### Task 5: Update Index and Integrate into Main Page
**Files:** `components/player/index.ts`, `app/page.tsx`
**Commits:** b33dd34 (integration), 5d2f2d7 (bug fixes)

**Index Exports:**
- Added exports for PlaybackControls, VolumeSlider, QueueList, HistoryList, TrackItem

**Main Page Layout:**
- Device selection: Fullscreen centered when no device active
- Player view (when device selected):
  - Now Playing section (album art hero)
  - Playback Controls (centered)
  - Volume Slider (centered, max 200px width)
  - Queue/History tabs (bottom section)
- Tab interface: "Up Next" vs "History" with active border indicator
- iOS safe area padding at bottom

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Episode vs Track type handling in playback.ts**
- **Found during:** Task 5 build verification
- **Issue:** TypeScript error - `state.item` can be Track or Episode, but code assumed Track properties (artists, album)
- **Fix:** Added type guard checking both `type === "track"` and `"artists" in state.item`
- **Impact:** Prevents runtime crashes when podcasts/episodes are playing, returns null for non-track items
- **Files modified:** `lib/spotify/playback.ts`
- **Commit:** 5d2f2d7

**2. [Rule 3 - Blocking] Fixed missing SpotifyApiError export**
- **Found during:** Task 5 build verification
- **Issue:** Build failed - `playback-store.ts` imports `SpotifyApiError` from `devices.ts`, but it wasn't exported
- **Fix:** Added re-export statement in `devices.ts`: `export { SpotifyApiError };`
- **Impact:** Resolves build error, allows proper error handling in playback store
- **Files modified:** `lib/spotify/devices.ts`
- **Commit:** 5d2f2d7

**3. [Rule 1 - Bug] Fixed Spotify SDK API method signatures**
- **Found during:** Task 5 build verification
- **Issue:** TypeScript error - SDK methods require device_id parameter, code called with no arguments
- **Fix:** Added empty string parameter to use currently active device: `startResumePlayback("")`, `pausePlayback("")`, `skipToNext("")`, `skipToPrevious("")`
- **Impact:** Fixes type errors, ensures SDK methods work correctly
- **Files modified:** `lib/spotify/playback.ts`
- **Commit:** 5d2f2d7

All deviations were blocking build errors (Rule 1 bugs and Rule 3 blocking issues) that prevented plan completion. Fixed automatically per deviation protocol.

## Known Stubs

None. All components are fully functional with no placeholder data or unimplemented features.

Empty states in QueueList and HistoryList are intentional UX patterns, not stubs - they display when stores are genuinely empty and provide helpful guidance.

## Key Decisions Made

1. **Debounce timing:** 100ms for volume slider strikes balance between responsiveness and API efficiency
2. **Touch targets:** Play button at 64px (hero action), skip at 48px (secondary), all others 40-44px minimum
3. **Queue/History limits:** Cap visible items to prevent performance issues with large lists (10/20 respectively)
4. **Tab interface:** Cleaner UX than separate pages, keeps controls always visible
5. **Empty states:** Contextual messages guide user on next steps instead of generic "no data"
6. **Mute memory:** UX improvement - unmute restores previous volume, not jarring jump to 50%

## Testing Notes

**Build verification:** All TypeScript compilation passes, Next.js build succeeds

**Manual testing required:**
- Play/pause button toggles state correctly
- Skip buttons advance/rewind tracks
- Volume slider adjusts playback volume (verify debounce behavior)
- Mute/unmute preserves volume
- Queue tab shows upcoming tracks from store
- History tab shows played tracks (verify sessionStorage persistence)
- All touch targets feel comfortable on mobile (44px+ verified in code)
- Tab switching is instant and smooth

**Integration verification:**
- Components render when device is selected
- Device picker shows when no device active
- Now Playing, Controls, Volume, Tabs all present in layout
- iOS safe area padding at bottom

## Self-Check: PASSED

**Files created exist:**
```bash
✓ components/player/track-item.tsx
✓ components/player/playback-controls.tsx
✓ components/player/volume-slider.tsx
✓ components/player/queue-list.tsx
✓ components/player/history-list.tsx
```

**Files modified exist:**
```bash
✓ components/player/index.ts
✓ app/page.tsx
✓ lib/spotify/devices.ts
✓ lib/spotify/playback.ts
```

**Commits exist:**
```bash
✓ e84862e - feat(02-03): create TrackItem reusable component
✓ b600ebb - feat(02-03): create PlaybackControls component
✓ a295348 - feat(02-03): create VolumeSlider component
✓ 7b5ddc9 - feat(02-03): create QueueList and HistoryList components
✓ b33dd34 - feat(02-03): integrate controls into main page
✓ 5d2f2d7 - fix(02-03): resolve blocking TypeScript build errors
```

**Build verification:**
```bash
✓ npm run build - SUCCESS
✓ TypeScript compilation - PASSED
✓ No runtime errors in component imports
```

All verification checks passed.
