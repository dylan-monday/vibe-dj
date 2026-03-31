---
phase: 02-playback-core
plan: 01
subsystem: playback
tags: [zustand, spotify-api, page-visibility, polling, state-management]

# Dependency graph
requires:
  - phase: 01-auth-devices
    provides: Spotify auth flow, device management, error handling patterns
provides:
  - Playback API wrapper with 7 control functions
  - Expanded playback store with optimistic updates
  - Queue store with sessionStorage-persisted history
  - Polling hook with 3s intervals and Page Visibility handling
affects: [02-02-now-playing-ui, 02-03-playback-controls, queue-management, ai-curation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared error handling module (errors.ts) for Spotify API wrappers"
    - "Optimistic UI updates with rollback on API errors"
    - "Debounced volume changes (300ms) to avoid API spam"
    - "Page Visibility API for efficient polling"
    - "Exponential backoff (10s → 30s) when playback is paused"

key-files:
  created:
    - lib/spotify/playback.ts
    - lib/spotify/errors.ts
    - lib/stores/queue-store.ts
    - lib/hooks/use-playback-polling.ts
  modified:
    - lib/spotify/types.ts
    - lib/spotify/devices.ts
    - lib/stores/playback-store.ts

key-decisions:
  - "Extracted shared error handling to errors.ts to avoid duplication across API modules"
  - "Used optimistic updates for play/pause/volume for immediate UI feedback"
  - "Debounced volume changes at 300ms to prevent API rate limiting"
  - "Polling backoff starts at 10s when paused, caps at 30s"
  - "History limited to 100 tracks to prevent unbounded storage growth"

patterns-established:
  - "Pattern 1: All Spotify API wrappers use withErrorHandling for retry logic and token refresh"
  - "Pattern 2: Playback controls optimistically update state, then revert on error"
  - "Pattern 3: Queue history persisted to sessionStorage with partialize middleware"

requirements-completed: [PLAY-01, PLAY-03, PLAY-05]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 02 Plan 01: Playback State Summary

**Playback polling infrastructure with 3s intervals, optimistic controls, and sessionStorage-persisted history using Zustand**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T13:30:00Z
- **Completed:** 2026-03-31T13:45:00Z
- **Tasks:** 4
- **Files modified:** 9

## Accomplishments
- Playback API module with 7 control functions (getPlaybackState, play, pause, skipNext, skipPrevious, setVolume, seekToPosition)
- Shared error handling module (errors.ts) with retry logic and exponential backoff
- Expanded playback store with full state tracking and optimistic UI updates
- Queue store with sessionStorage persistence for history (survives page reload)
- Polling hook with 3s active intervals, exponential backoff when paused, and Page Visibility handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create playback API module** - `db5b6ba` (feat)
2. **Task 2: Expand playback store with current track state** - `4385ee4` (feat)
3. **Task 3: Create queue and history store** - `faaf200` (feat)
4. **Task 4: Create polling hook with Page Visibility handling** - `6317213` (feat)

## Files Created/Modified
- `lib/spotify/playback.ts` - Playback API wrapper with 7 control functions
- `lib/spotify/errors.ts` - Shared error handling with retry logic and exponential backoff
- `lib/spotify/types.ts` - Added QueueTrack and SessionHistory types
- `lib/spotify/devices.ts` - Refactored to use shared error handling
- `lib/stores/playback-store.ts` - Expanded with full state, control actions, optimistic updates
- `lib/stores/queue-store.ts` - Queue and history management with sessionStorage persistence
- `lib/hooks/use-playback-polling.ts` - Polling orchestrator with Page Visibility handling

## Decisions Made
- **Extracted shared error handling:** Created errors.ts module to avoid code duplication between playback.ts and devices.ts
- **Optimistic updates:** Controls (play/pause, volume, seek) update UI immediately, revert on error for better UX
- **Volume debouncing:** 300ms debounce on volume changes to prevent API spam during slider interaction
- **Polling backoff:** Starts at 10s when paused, increases 1.5x per cycle, caps at 30s
- **History limit:** Capped at 100 tracks to prevent unbounded sessionStorage growth

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extracted shared error handling to errors.ts**
- **Found during:** Task 1 (Creating playback.ts)
- **Issue:** Both devices.ts and playback.ts would have identical error handling code (withErrorHandling, SpotifyApiError, retry logic). Code duplication violates DRY and makes maintenance harder.
- **Fix:** Created lib/spotify/errors.ts with shared SpotifyApiError class and withErrorHandling function. Refactored devices.ts to import from errors.ts.
- **Files modified:** lib/spotify/errors.ts (created), lib/spotify/devices.ts, lib/spotify/playback.ts
- **Verification:** Both modules import successfully, type checking passes
- **Committed in:** db5b6ba (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical functionality)
**Impact on plan:** Auto-fix necessary to avoid code duplication and establish shared error handling pattern. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Playback state infrastructure complete and ready for UI consumption
- Now Playing UI (02-02) can consume usePlaybackStore for track info and controls
- Polling hook ready to be mounted in main app layout
- Queue display can consume useQueueStore for upcoming tracks and history

## Self-Check: PASSED

All created files verified:
- lib/spotify/playback.ts ✓
- lib/spotify/errors.ts ✓
- lib/stores/queue-store.ts ✓
- lib/hooks/use-playback-polling.ts ✓

All commits verified:
- db5b6ba (Task 1) ✓
- 4385ee4 (Task 2) ✓
- faaf200 (Task 3) ✓
- 6317213 (Task 4) ✓

---
*Phase: 02-playback-core*
*Completed: 2026-03-31*
