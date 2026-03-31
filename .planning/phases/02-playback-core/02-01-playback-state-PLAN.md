---
phase: 02-playback-core
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/spotify/playback.ts
  - lib/spotify/types.ts
  - lib/spotify/index.ts
  - lib/stores/playback-store.ts
  - lib/stores/queue-store.ts
  - lib/stores/index.ts
  - lib/hooks/use-playback-polling.ts
  - lib/hooks/index.ts
autonomous: true
requirements:
  - PLAY-01
  - PLAY-03
  - PLAY-05

must_haves:
  truths:
    - "Playback state updates every 3 seconds when track is playing"
    - "Polling pauses when tab is backgrounded"
    - "Polling uses exponential backoff when paused"
    - "Queue state tracks upcoming and played tracks"
    - "History persists in session (survives page reload)"
  artifacts:
    - path: "lib/spotify/playback.ts"
      provides: "Spotify playback API wrapper"
      exports: ["getPlaybackState", "play", "pause", "skipNext", "skipPrevious", "setVolume", "seekToPosition"]
    - path: "lib/stores/playback-store.ts"
      provides: "Expanded playback state with polling"
      exports: ["usePlaybackStore"]
    - path: "lib/stores/queue-store.ts"
      provides: "Queue and history management"
      exports: ["useQueueStore"]
    - path: "lib/hooks/use-playback-polling.ts"
      provides: "Polling orchestrator with visibility handling"
      exports: ["usePlaybackPolling"]
  key_links:
    - from: "lib/hooks/use-playback-polling.ts"
      to: "lib/spotify/playback.ts"
      via: "getPlaybackState call every 3s"
      pattern: "getPlaybackState\\(\\)"
    - from: "lib/stores/playback-store.ts"
      to: "lib/spotify/types.ts"
      via: "PlaybackState type usage"
      pattern: "PlaybackState"
---

<objective>
Build the playback state infrastructure: polling orchestrator, Spotify playback API wrapper, and Zustand stores for playback and queue state.

Purpose: This is the data foundation that the Now Playing UI and controls will consume. Without reliable playback state polling and queue tracking, the UI cannot display current track info or manage history.

Output: Playback API module, expanded playback store, queue/history store, polling hook with Page Visibility handling.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/research/SUMMARY.md

# Phase 1 foundation
@lib/spotify/auth.ts
@lib/spotify/client.ts
@lib/spotify/devices.ts
@lib/spotify/types.ts
@lib/stores/playback-store.ts

<interfaces>
<!-- Key types and contracts the executor needs -->

From lib/spotify/types.ts (existing):
```typescript
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
```

From lib/spotify/devices.ts (error handling pattern):
```typescript
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: number
  ) { ... }
}

async function withErrorHandling<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> { ... }
```

From lib/spotify/client.ts:
```typescript
export function getSpotifyClient(): SpotifyApi | null;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create playback API module</name>
  <files>lib/spotify/playback.ts, lib/spotify/types.ts, lib/spotify/index.ts</files>
  <read_first>
    - lib/spotify/devices.ts (copy withErrorHandling pattern)
    - lib/spotify/types.ts (existing PlaybackState type)
    - lib/spotify/client.ts (getSpotifyClient usage)
    - lib/spotify/auth.ts (ensureValidToken usage)
  </read_first>
  <action>
Create `lib/spotify/playback.ts` with these exports:

1. `getPlaybackState(): Promise<PlaybackState | null>` - Fetch current playback
   - Call `client.player.getPlaybackState()`
   - Handle 204 (no active playback) -> return null
   - Map SDK response to our PlaybackState type
   - Use `withErrorHandling` wrapper (copy from devices.ts, or import if exported)

2. `play(): Promise<void>` - Resume playback
   - Call `client.player.startResumePlayback()`
   - Wrap with error handling

3. `pause(): Promise<void>` - Pause playback
   - Call `client.player.pausePlayback()`

4. `skipNext(): Promise<void>` - Skip to next track
   - Call `client.player.skipToNext()`

5. `skipPrevious(): Promise<void>` - Skip to previous track
   - Call `client.player.skipToPrevious()`

6. `setVolume(percent: number): Promise<void>` - Set volume (0-100)
   - Call `client.player.setPlaybackVolume(percent)`
   - Clamp percent to 0-100 range

7. `seekToPosition(positionMs: number): Promise<void>` - Seek within track
   - Call `client.player.seekToPosition(positionMs)`

Update `lib/spotify/types.ts`:
- Add `QueueTrack` type for queue items (id, name, artists, album, durationMs, addedAt)
- Add `SessionHistory` type (tracks array, sessionId)

Update `lib/spotify/index.ts` to export from playback.ts

Import `withErrorHandling` from devices.ts (move it to a shared errors.ts if cleaner, or just re-export).
  </action>
  <verify>
    <automated>grep -n "export async function getPlaybackState" lib/spotify/playback.ts && grep -n "export async function play" lib/spotify/playback.ts && grep -n "export async function setVolume" lib/spotify/playback.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "getPlaybackState" lib/spotify/playback.ts returns match
    - grep "skipNext" lib/spotify/playback.ts returns match
    - grep "setVolume" lib/spotify/playback.ts returns match
    - grep "QueueTrack" lib/spotify/types.ts returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>Playback API module exports all 7 functions with error handling, types updated</done>
</task>

<task type="auto">
  <name>Task 2: Expand playback store with current track state</name>
  <files>lib/stores/playback-store.ts</files>
  <read_first>
    - lib/stores/playback-store.ts (existing store structure)
    - lib/spotify/types.ts (PlaybackState type)
    - lib/spotify/playback.ts (newly created API)
  </read_first>
  <action>
Expand `lib/stores/playback-store.ts` to include full playback state:

Add to state:
```typescript
// Playback state
currentTrack: PlaybackState['track'] | null;
isPlaying: boolean;
progressMs: number;
durationMs: number;
volume: number;
lastPolledAt: number | null;
isStale: boolean; // true if lastPolledAt > 5 seconds ago

// Polling control
pollingInterval: number; // 3000ms when playing, exponential backoff when paused
isPolling: boolean;
```

Add actions:
```typescript
// State updates (called by polling hook)
updatePlaybackState: (state: PlaybackState | null) => void;
setProgress: (ms: number) => void; // For local progress interpolation
markStale: () => void;

// Playback controls (call API + optimistic update)
togglePlayPause: () => Promise<void>;
skipToNext: () => Promise<void>;
skipToPrevious: () => Promise<void>;
changeVolume: (percent: number) => Promise<void>;
seekTo: (positionMs: number) => Promise<void>;

// Polling control
startPolling: () => void;
stopPolling: () => void;
setPollingInterval: (ms: number) => void;
```

For `togglePlayPause`, `skipToNext`, `skipToPrevious`:
- Update state optimistically first
- Call API function
- If API fails, revert state and set error

Volume slider should call `changeVolume` which:
- Updates local volume immediately (optimistic)
- Debounces API call (don't spam Spotify)
  </action>
  <verify>
    <automated>grep -n "currentTrack" lib/stores/playback-store.ts && grep -n "togglePlayPause" lib/stores/playback-store.ts && grep -n "isStale" lib/stores/playback-store.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "currentTrack:" lib/stores/playback-store.ts returns match
    - grep "isPlaying:" lib/stores/playback-store.ts returns match (state field, not just SDK type)
    - grep "togglePlayPause" lib/stores/playback-store.ts returns match
    - grep "skipToNext" lib/stores/playback-store.ts returns match
    - grep "changeVolume" lib/stores/playback-store.ts returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>Playback store has full state + control actions with optimistic updates</done>
</task>

<task type="auto">
  <name>Task 3: Create queue and history store</name>
  <files>lib/stores/queue-store.ts, lib/stores/index.ts</files>
  <read_first>
    - lib/stores/playback-store.ts (store pattern)
    - lib/spotify/types.ts (QueueTrack type)
  </read_first>
  <action>
Create `lib/stores/queue-store.ts` with Zustand + persist middleware:

State:
```typescript
interface QueueStore {
  // Queue state
  upcomingTracks: QueueTrack[];

  // History state (persisted to sessionStorage)
  playedTracks: QueueTrack[];
  sessionId: string; // UUID generated on first load

  // Actions
  setUpcoming: (tracks: QueueTrack[]) => void;
  addToHistory: (track: QueueTrack) => void;
  clearHistory: () => void;
  clearQueue: () => void;
}
```

Use Zustand persist middleware with sessionStorage:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useQueueStore = create<QueueStore>()(
  persist(
    (set, get) => ({
      // ... state and actions
    }),
    {
      name: 'vibe-dj-queue',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        playedTracks: state.playedTracks,
        sessionId: state.sessionId
      }),
    }
  )
);
```

Generate sessionId on store creation if not present (use crypto.randomUUID()).

`addToHistory` should:
- Add track to beginning of playedTracks array
- Check for duplicates by track.id (don't add if already at top)
- Limit to 100 tracks max

Update `lib/stores/index.ts` to export useQueueStore.
  </action>
  <verify>
    <automated>grep -n "useQueueStore" lib/stores/queue-store.ts && grep -n "playedTracks" lib/stores/queue-store.ts && grep -n "sessionStorage" lib/stores/queue-store.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "export const useQueueStore" lib/stores/queue-store.ts returns match
    - grep "playedTracks:" lib/stores/queue-store.ts returns match
    - grep "addToHistory" lib/stores/queue-store.ts returns match
    - grep "persist" lib/stores/queue-store.ts returns match (middleware)
    - grep "sessionStorage" lib/stores/queue-store.ts returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>Queue store with sessionStorage persistence for history, upcoming tracks array</done>
</task>

<task type="auto">
  <name>Task 4: Create polling hook with Page Visibility handling</name>
  <files>lib/hooks/use-playback-polling.ts, lib/hooks/index.ts</files>
  <read_first>
    - lib/stores/playback-store.ts (store actions to call)
    - lib/stores/queue-store.ts (addToHistory action)
    - lib/spotify/playback.ts (getPlaybackState function)
  </read_first>
  <action>
Create `lib/hooks/use-playback-polling.ts`:

```typescript
import { useEffect, useRef, useCallback } from 'react';
import { usePlaybackStore } from '@/lib/stores/playback-store';
import { useQueueStore } from '@/lib/stores/queue-store';
import { getPlaybackState } from '@/lib/spotify/playback';

const ACTIVE_POLL_INTERVAL = 3000; // 3 seconds when playing
const PAUSED_POLL_INTERVAL = 10000; // 10 seconds when paused
const MAX_BACKOFF = 30000; // Max 30 seconds

export function usePlaybackPolling() {
  const {
    updatePlaybackState,
    isPlaying,
    currentTrack,
    startPolling,
    stopPolling,
  } = usePlaybackStore();

  const { addToHistory } = useQueueStore();

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const backoffRef = useRef(PAUSED_POLL_INTERVAL);
  const lastTrackIdRef = useRef<string | null>(null);

  const poll = useCallback(async () => {
    try {
      const state = await getPlaybackState();
      updatePlaybackState(state);

      // Track changed - add previous to history
      if (state?.track && lastTrackIdRef.current &&
          state.track.id !== lastTrackIdRef.current) {
        // The previous track finished playing
      }

      // Track history on track change
      if (state?.track && state.track.id !== lastTrackIdRef.current) {
        if (lastTrackIdRef.current && currentTrack) {
          addToHistory({
            id: currentTrack.id,
            name: currentTrack.name,
            artists: currentTrack.artists,
            album: currentTrack.album,
            durationMs: currentTrack.durationMs,
            addedAt: Date.now(),
          });
        }
        lastTrackIdRef.current = state.track.id;
      }

      // Reset backoff on successful poll while playing
      if (state?.isPlaying) {
        backoffRef.current = PAUSED_POLL_INTERVAL;
      }
    } catch (error) {
      console.error('Polling error:', error);
      // Don't crash polling on error, just skip this cycle
    }
  }, [updatePlaybackState, addToHistory, currentTrack]);

  // Start/stop polling based on visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab backgrounded - stop polling
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        stopPolling();
      } else {
        // Tab visible - resume polling
        poll(); // Immediate poll on focus
        startPolling();
        startInterval();
      }
    };

    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);

      const interval = isPlaying ? ACTIVE_POLL_INTERVAL : backoffRef.current;
      intervalRef.current = setInterval(() => {
        poll();
        // Increase backoff when paused
        if (!isPlaying) {
          backoffRef.current = Math.min(backoffRef.current * 1.5, MAX_BACKOFF);
        }
      }, interval);
    };

    // Initial poll
    poll();
    startPolling();
    startInterval();

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      stopPolling();
    };
  }, [poll, isPlaying, startPolling, stopPolling]);

  return { poll }; // Expose manual poll trigger
}
```

Key behaviors:
- Poll every 3s when playing, 10s+ when paused
- Exponential backoff when paused (caps at 30s)
- Stop polling when tab is backgrounded (Page Visibility API)
- Resume immediately when tab becomes visible
- Track changes trigger history update

Update `lib/hooks/index.ts` to export usePlaybackPolling.
  </action>
  <verify>
    <automated>grep -n "usePlaybackPolling" lib/hooks/use-playback-polling.ts && grep -n "visibilitychange" lib/hooks/use-playback-polling.ts && grep -n "ACTIVE_POLL_INTERVAL" lib/hooks/use-playback-polling.ts</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function usePlaybackPolling" lib/hooks/use-playback-polling.ts returns match
    - grep "visibilitychange" lib/hooks/use-playback-polling.ts returns match
    - grep "3000" lib/hooks/use-playback-polling.ts returns match (3s interval)
    - grep "addToHistory" lib/hooks/use-playback-polling.ts returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>Polling hook with 3s active interval, Page Visibility handling, history tracking</done>
</task>

</tasks>

<verification>
After all tasks:
1. `npm run type-check` - No TypeScript errors
2. `npm run build` - Build succeeds
3. Verify exports:
   - `grep -r "getPlaybackState" lib/spotify/`
   - `grep -r "usePlaybackStore" lib/stores/`
   - `grep -r "useQueueStore" lib/stores/`
   - `grep -r "usePlaybackPolling" lib/hooks/`
</verification>

<success_criteria>
- Playback API module with 7 exported functions
- Playback store expanded with track state + control actions
- Queue store with sessionStorage-persisted history
- Polling hook with 3s interval and Page Visibility handling
- All TypeScript compiles without errors
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/02-playback-core/02-01-SUMMARY.md`
</output>
