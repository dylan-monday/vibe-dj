---
phase: 02-playback-core
plan: 03
type: execute
wave: 2
depends_on:
  - 02-01
  - 02-02
files_modified:
  - components/player/playback-controls.tsx
  - components/player/volume-slider.tsx
  - components/player/queue-list.tsx
  - components/player/history-list.tsx
  - components/player/track-item.tsx
  - components/player/index.ts
  - app/page.tsx
autonomous: true
requirements:
  - PLAY-02
  - PLAY-03
  - PLAY-05
  - UI-01

must_haves:
  truths:
    - "User can play and pause with a single tap"
    - "User can skip to next track"
    - "User can skip to previous track"
    - "User can adjust volume with a slider"
    - "User sees next 5-10 tracks in upcoming queue"
    - "User sees scrollable history of played tracks"
    - "All controls have minimum 44x44px touch targets"
  artifacts:
    - path: "components/player/playback-controls.tsx"
      provides: "Play/pause, skip buttons"
      exports: ["PlaybackControls"]
    - path: "components/player/volume-slider.tsx"
      provides: "Volume control slider"
      exports: ["VolumeSlider"]
    - path: "components/player/queue-list.tsx"
      provides: "Upcoming tracks display"
      exports: ["QueueList"]
    - path: "components/player/history-list.tsx"
      provides: "Played tracks display"
      exports: ["HistoryList"]
    - path: "components/player/track-item.tsx"
      provides: "Reusable track row component"
      exports: ["TrackItem"]
  key_links:
    - from: "components/player/playback-controls.tsx"
      to: "lib/stores/playback-store.ts"
      via: "togglePlayPause, skipToNext, skipToPrevious actions"
      pattern: "togglePlayPause|skipToNext|skipToPrevious"
    - from: "components/player/volume-slider.tsx"
      to: "lib/stores/playback-store.ts"
      via: "changeVolume action"
      pattern: "changeVolume"
    - from: "components/player/history-list.tsx"
      to: "lib/stores/queue-store.ts"
      via: "playedTracks state"
      pattern: "playedTracks"
---

<objective>
Create playback controls (play/pause, skip, volume), queue display, and history list with touch-friendly mobile design.

Purpose: This completes the playback interface. Users need intuitive controls to manage playback and visibility into what's coming next and what has played. Touch-friendly sizing ensures the coffee-table phone use case works well.

Output: PlaybackControls, VolumeSlider, QueueList, HistoryList components integrated into main page.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/research/SUMMARY.md

# Design direction
@app/globals.css
@tailwind.config.ts

# Components from Plan 02 (parallel, but complete by Wave 2)
@components/player/album-art.tsx
@components/player/now-playing.tsx

<interfaces>
<!-- Types and store interfaces from Plans 01 and 02 -->

From lib/stores/playback-store.ts (Plan 01):
```typescript
interface PlaybackStore {
  // State
  currentTrack: PlaybackState['track'] | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;

  // Control actions
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  changeVolume: (percent: number) => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;
}
```

From lib/stores/queue-store.ts (Plan 01):
```typescript
interface QueueStore {
  upcomingTracks: QueueTrack[];
  playedTracks: QueueTrack[];
  sessionId: string;
}
```

From lib/spotify/types.ts (Plan 01):
```typescript
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
  addedAt: number;
}
```

Design tokens:
- Primary: #7c3aed (purple)
- Accent magenta: #ec4899
- Accent cyan: #06b6d4
- Surface: #27272a
- Surface elevated: #3f3f46
- Touch target minimum: 44x44px
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create TrackItem reusable component</name>
  <files>components/player/track-item.tsx</files>
  <read_first>
    - components/player/album-art.tsx (AlbumArt component for thumbnails)
    - lib/spotify/types.ts (QueueTrack type)
    - app/globals.css (design tokens)
  </read_first>
  <action>
Create `components/player/track-item.tsx`:

```typescript
"use client";

import { AlbumArt } from "./album-art";

interface TrackItemProps {
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
  };
  variant?: "queue" | "history";
  isCurrentTrack?: boolean;
  onClick?: () => void;
}

// Format duration to m:ss
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function TrackItem({
  track,
  variant = "queue",
  isCurrentTrack = false,
  onClick,
}: TrackItemProps) {
  const albumImageUrl = track.album.images[track.album.images.length - 1]?.url || null;
  const artistNames = track.artists.map((a) => a.name).join(", ");

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-colors
        ${isCurrentTrack
          ? "bg-primary/20 border border-primary/30"
          : "hover:bg-surface-elevated active:bg-surface-elevated/80"
        }
        ${!onClick ? "cursor-default" : ""}
        min-h-[56px] touch-manipulation
      `}
    >
      {/* Album thumbnail */}
      <AlbumArt
        imageUrl={albumImageUrl}
        albumName={track.album.name}
        size="sm"
      />

      {/* Track info */}
      <div className="flex-1 min-w-0 text-left">
        <p
          className={`text-sm font-medium truncate ${
            isCurrentTrack ? "text-primary" : "text-foreground"
          }`}
        >
          {track.name}
        </p>
        <p className="text-xs text-foreground/60 truncate">{artistNames}</p>
      </div>

      {/* Duration */}
      <span className="text-xs text-foreground/50 font-mono tabular-nums">
        {formatDuration(track.durationMs)}
      </span>

      {/* Playing indicator for current track */}
      {isCurrentTrack && (
        <div className="flex gap-0.5 items-end h-4">
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "60%" }} />
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "100%", animationDelay: "0.2s" }} />
          <span className="w-1 bg-primary rounded-full animate-pulse" style={{ height: "40%", animationDelay: "0.4s" }} />
        </div>
      )}
    </button>
  );
}
```

Features:
- Reusable for both queue and history
- Album thumbnail using AlbumArt sm size
- Touch-friendly minimum height (56px > 44px)
- Current track highlight with animated bars
- Truncation for long names
- Duration in mono font
  </action>
  <verify>
    <automated>grep -n "export function TrackItem" components/player/track-item.tsx && grep -n "min-h-\[56px\]" components/player/track-item.tsx && grep -n "touch-manipulation" components/player/track-item.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function TrackItem" components/player/track-item.tsx returns match
    - grep "min-h-\[56px\]" components/player/track-item.tsx returns match (touch target)
    - grep "AlbumArt" components/player/track-item.tsx returns match
    - grep "isCurrentTrack" components/player/track-item.tsx returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>TrackItem component with touch-friendly sizing, album thumbnail, current track indicator</done>
</task>

<task type="auto">
  <name>Task 2: Create PlaybackControls component</name>
  <files>components/player/playback-controls.tsx</files>
  <read_first>
    - lib/stores/playback-store.ts (control actions)
    - app/globals.css (design tokens)
  </read_first>
  <action>
Create `components/player/playback-controls.tsx`:

```typescript
"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

export function PlaybackControls() {
  const {
    isPlaying,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    currentTrack,
  } = usePlaybackStore();

  const isDisabled = !currentTrack;

  // SVG icons as components for clarity
  const PlayIcon = () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  );

  const PauseIcon = () => (
    <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );

  const SkipNextIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm2 0V6l6.5 4.5L8 15v3zm8-12v12h2V6h-2z" />
    </svg>
  );

  const SkipPrevIcon = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6zm6.5 3V9l-4.5 3 4.5 3z" />
    </svg>
  );

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Skip Previous */}
      <button
        onClick={() => skipToPrevious()}
        disabled={isDisabled}
        className={`
          w-12 h-12 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/80 hover:text-foreground hover:bg-surface-elevated active:scale-95"
          }
        `}
        aria-label="Previous track"
      >
        <SkipPrevIcon />
      </button>

      {/* Play/Pause - larger, primary action */}
      <button
        onClick={() => togglePlayPause()}
        disabled={isDisabled}
        className={`
          w-16 h-16 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "bg-surface text-foreground/30 cursor-not-allowed"
            : "bg-primary text-white hover:bg-primary-dark active:scale-95 shadow-lg shadow-primary/30"
          }
        `}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>

      {/* Skip Next */}
      <button
        onClick={() => skipToNext()}
        disabled={isDisabled}
        className={`
          w-12 h-12 flex items-center justify-center rounded-full
          transition-all duration-150
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/80 hover:text-foreground hover:bg-surface-elevated active:scale-95"
          }
        `}
        aria-label="Next track"
      >
        <SkipNextIcon />
      </button>
    </div>
  );
}
```

Key features:
- Play/pause is 64x64px (hero button) with primary color
- Skip buttons are 48x48px (all exceed 44px minimum)
- Active states with scale-95 for tactile feedback
- Disabled state when nothing playing
- Shadow on play button for depth
- SVG icons inline for simplicity
  </action>
  <verify>
    <automated>grep -n "export function PlaybackControls" components/player/playback-controls.tsx && grep -n "togglePlayPause" components/player/playback-controls.tsx && grep -n "w-16 h-16" components/player/playback-controls.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function PlaybackControls" components/player/playback-controls.tsx returns match
    - grep "togglePlayPause" components/player/playback-controls.tsx returns match
    - grep "skipToNext" components/player/playback-controls.tsx returns match
    - grep "w-16 h-16" components/player/playback-controls.tsx returns match (play button size)
    - grep "w-12 h-12" components/player/playback-controls.tsx returns match (skip button size)
    - npm run type-check passes
  </acceptance_criteria>
  <done>PlaybackControls with play/pause, skip buttons, touch-friendly sizing, disabled states</done>
</task>

<task type="auto">
  <name>Task 3: Create VolumeSlider component</name>
  <files>components/player/volume-slider.tsx</files>
  <read_first>
    - lib/stores/playback-store.ts (volume state and changeVolume action)
    - components/player/progress-bar.tsx (slider pattern reference)
    - app/globals.css (design tokens)
  </read_first>
  <action>
Create `components/player/volume-slider.tsx`:

```typescript
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";

export function VolumeSlider() {
  const { volume, changeVolume, activeDevice } = usePlaybackStore();
  const [localVolume, setLocalVolume] = useState(volume);
  const [isDragging, setIsDragging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolume = useRef(volume);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with store volume when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalVolume(volume);
    }
  }, [volume, isDragging]);

  // Debounced API call
  const debouncedVolumeChange = useCallback((newVolume: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      changeVolume(newVolume);
    }, 100);
  }, [changeVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setLocalVolume(newVolume);
    setIsMuted(newVolume === 0);
    debouncedVolumeChange(newVolume);
  };

  const toggleMute = () => {
    if (isMuted || localVolume === 0) {
      // Unmute - restore previous volume
      const restoreVolume = previousVolume.current > 0 ? previousVolume.current : 50;
      setLocalVolume(restoreVolume);
      setIsMuted(false);
      changeVolume(restoreVolume);
    } else {
      // Mute
      previousVolume.current = localVolume;
      setLocalVolume(0);
      setIsMuted(true);
      changeVolume(0);
    }
  };

  // Volume icons
  const VolumeIcon = () => {
    if (isMuted || localVolume === 0) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      );
    }
    if (localVolume < 50) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    );
  };

  const isDisabled = !activeDevice;

  return (
    <div className="flex items-center gap-3 w-full max-w-[200px]">
      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        disabled={isDisabled}
        className={`
          w-10 h-10 flex items-center justify-center rounded-full shrink-0
          transition-colors
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/70 hover:text-foreground hover:bg-surface-elevated"
          }
        `}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        <VolumeIcon />
      </button>

      {/* Volume slider */}
      <div className="flex-1 relative">
        <input
          type="range"
          min={0}
          max={100}
          value={localVolume}
          onChange={handleVolumeChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={isDisabled}
          className={`
            w-full h-10 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full
            [&::-webkit-slider-runnable-track]:bg-surface-elevated
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground
            [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:shadow-md
            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          style={{
            // Custom track fill via CSS gradient
            background: isDisabled
              ? undefined
              : `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${localVolume}%, transparent ${localVolume}%)`,
          }}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
```

Features:
- Mute toggle button with appropriate icon
- Slider with 100ms debounce to avoid API spam
- Local state for smooth dragging
- Track fill gradient showing volume level
- Touch-friendly (40px mute button, 40px slider height)
- Remembers previous volume when unmuting
  </action>
  <verify>
    <automated>grep -n "export function VolumeSlider" components/player/volume-slider.tsx && grep -n "changeVolume" components/player/volume-slider.tsx && grep -n "debounce" components/player/volume-slider.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function VolumeSlider" components/player/volume-slider.tsx returns match
    - grep "changeVolume" components/player/volume-slider.tsx returns match
    - grep "debounce" components/player/volume-slider.tsx returns match (debounced API call)
    - grep "toggleMute" components/player/volume-slider.tsx returns match
    - grep "w-10 h-10" components/player/volume-slider.tsx returns match (touch target)
    - npm run type-check passes
  </acceptance_criteria>
  <done>VolumeSlider with mute toggle, debounced API calls, touch-friendly sizing</done>
</task>

<task type="auto">
  <name>Task 4: Create QueueList and HistoryList components</name>
  <files>components/player/queue-list.tsx, components/player/history-list.tsx</files>
  <read_first>
    - components/player/track-item.tsx (TrackItem component)
    - lib/stores/queue-store.ts (queue and history state)
    - lib/stores/playback-store.ts (currentTrack for highlighting)
  </read_first>
  <action>
Create `components/player/queue-list.tsx`:

```typescript
"use client";

import { useQueueStore } from "@/lib/stores/queue-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { TrackItem } from "./track-item";

interface QueueListProps {
  maxTracks?: number;
}

export function QueueList({ maxTracks = 10 }: QueueListProps) {
  const { upcomingTracks } = useQueueStore();
  const { currentTrack } = usePlaybackStore();

  const displayTracks = upcomingTracks.slice(0, maxTracks);

  if (displayTracks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-foreground/50 text-sm">Queue is empty</p>
        <p className="text-foreground/30 text-xs mt-1">
          Tracks will appear here when you start a vibe
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Up Next</h3>
        <span className="text-xs text-foreground/50">
          {upcomingTracks.length} tracks
        </span>
      </div>
      <div className="max-h-[300px] overflow-y-auto px-2">
        {displayTracks.map((track, index) => (
          <TrackItem
            key={`${track.id}-${index}`}
            track={track}
            variant="queue"
            isCurrentTrack={currentTrack?.id === track.id}
          />
        ))}
        {upcomingTracks.length > maxTracks && (
          <p className="text-center text-xs text-foreground/40 py-2">
            +{upcomingTracks.length - maxTracks} more tracks
          </p>
        )}
      </div>
    </div>
  );
}
```

Create `components/player/history-list.tsx`:

```typescript
"use client";

import { useQueueStore } from "@/lib/stores/queue-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { TrackItem } from "./track-item";

interface HistoryListProps {
  maxTracks?: number;
}

export function HistoryList({ maxTracks = 20 }: HistoryListProps) {
  const { playedTracks, clearHistory } = useQueueStore();
  const { currentTrack } = usePlaybackStore();

  if (playedTracks.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-foreground/50 text-sm">No history yet</p>
        <p className="text-foreground/30 text-xs mt-1">
          Played tracks will appear here
        </p>
      </div>
    );
  }

  const displayTracks = playedTracks.slice(0, maxTracks);

  return (
    <div className="space-y-1">
      <div className="px-4 py-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Recently Played</h3>
        <button
          onClick={() => clearHistory()}
          className="text-xs text-foreground/50 hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="max-h-[400px] overflow-y-auto px-2">
        {displayTracks.map((track, index) => (
          <TrackItem
            key={`${track.id}-${track.addedAt}-${index}`}
            track={track}
            variant="history"
            isCurrentTrack={currentTrack?.id === track.id}
          />
        ))}
        {playedTracks.length > maxTracks && (
          <p className="text-center text-xs text-foreground/40 py-2">
            Showing {maxTracks} of {playedTracks.length} tracks
          </p>
        )}
      </div>
    </div>
  );
}
```

Features:
- Both use TrackItem for consistent styling
- QueueList shows max 10 by default with "+N more" indicator
- HistoryList shows max 20 by default, scrollable
- Clear button for history
- Empty states with helpful messages
- Scrollable containers with max-height
  </action>
  <verify>
    <automated>grep -n "export function QueueList" components/player/queue-list.tsx && grep -n "export function HistoryList" components/player/history-list.tsx && grep -n "upcomingTracks" components/player/queue-list.tsx && grep -n "playedTracks" components/player/history-list.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function QueueList" components/player/queue-list.tsx returns match
    - grep "export function HistoryList" components/player/history-list.tsx returns match
    - grep "upcomingTracks" components/player/queue-list.tsx returns match
    - grep "playedTracks" components/player/history-list.tsx returns match
    - grep "overflow-y-auto" components/player/queue-list.tsx returns match (scrollable)
    - npm run type-check passes
  </acceptance_criteria>
  <done>QueueList and HistoryList with scrollable containers, empty states, track counts</done>
</task>

<task type="auto">
  <name>Task 5: Update index and integrate into main page</name>
  <files>components/player/index.ts, app/page.tsx</files>
  <read_first>
    - components/player/index.ts (current exports)
    - app/page.tsx (current layout from Plan 02)
    - All new components created in this plan
  </read_first>
  <action>
Update `components/player/index.ts`:

```typescript
export { DevicePicker } from "./device-picker";
export { NowPlaying } from "./now-playing";
export { AlbumArt } from "./album-art";
export { ProgressBar } from "./progress-bar";
export { PlaybackControls } from "./playback-controls";
export { VolumeSlider } from "./volume-slider";
export { QueueList } from "./queue-list";
export { HistoryList } from "./history-list";
export { TrackItem } from "./track-item";
```

Update `app/page.tsx` to integrate all components:

```typescript
"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { LoginButton, LogoutButton } from "@/components/auth";
import {
  DevicePicker,
  NowPlaying,
  PlaybackControls,
  VolumeSlider,
  QueueList,
  HistoryList,
} from "@/components/player";

type TabId = "queue" | "history";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { activeDevice, currentTrack } = usePlaybackStore();
  const [activeTab, setActiveTab] = useState<TabId>("queue");

  // Start polling when authenticated
  usePlaybackPolling();

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

  // Authenticated - main player view
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-surface/50">
        <h1 className="text-lg font-display text-primary">Vibe DJ</h1>
        <div className="flex items-center gap-4">
          {activeDevice && (
            <span className="text-xs text-foreground/50 hidden sm:inline">
              {activeDevice.name}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* No device selected - show picker */}
        {!activeDevice && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <h2 className="text-xl text-center mb-4">Select a device</h2>
              <DevicePicker />
            </div>
          </div>
        )}

        {/* Device selected - show player */}
        {activeDevice && (
          <>
            {/* Now Playing section */}
            <section className="py-6">
              <NowPlaying />
            </section>

            {/* Playback Controls */}
            <section className="py-4">
              <PlaybackControls />
            </section>

            {/* Volume */}
            <section className="flex justify-center py-2">
              <VolumeSlider />
            </section>

            {/* Queue/History tabs */}
            <section className="flex-1 flex flex-col border-t border-surface mt-4">
              {/* Tab headers */}
              <div className="flex border-b border-surface">
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "queue"
                      ? "text-primary border-b-2 border-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  Up Next
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "history"
                      ? "text-primary border-b-2 border-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  History
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 bg-surface/30">
                {activeTab === "queue" && <QueueList maxTracks={10} />}
                {activeTab === "history" && <HistoryList maxTracks={20} />}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Safe area padding for iOS */}
      <div className="pb-safe" />
    </div>
  );
}
```

Key layout features:
- NowPlaying hero section
- Controls centered below
- Volume slider centered, max 200px
- Tabs for Queue/History at bottom
- Device picker fullscreen when no device
- iOS safe area padding
  </action>
  <verify>
    <automated>grep -n "PlaybackControls" app/page.tsx && grep -n "VolumeSlider" app/page.tsx && grep -n "QueueList" app/page.tsx && grep -n "HistoryList" app/page.tsx && grep -n "activeTab" app/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "PlaybackControls" app/page.tsx returns match (import and usage)
    - grep "VolumeSlider" app/page.tsx returns match
    - grep "QueueList" app/page.tsx returns match
    - grep "HistoryList" app/page.tsx returns match
    - grep "activeTab" app/page.tsx returns match (tab state)
    - npm run type-check passes
    - npm run build passes
  </acceptance_criteria>
  <done>All components exported and integrated into main page with tabbed queue/history</done>
</task>

</tasks>

<verification>
After all tasks:
1. `npm run type-check` - No TypeScript errors
2. `npm run build` - Build succeeds
3. Visual verification checklist:
   - Play/pause button toggles state
   - Skip buttons work
   - Volume slider adjusts (with debounce)
   - Mute/unmute works
   - Queue tab shows upcoming tracks
   - History tab shows played tracks
   - All touch targets are fingertip-friendly
</verification>

<success_criteria>
- PlaybackControls with play/pause, skip (all buttons 44px+)
- VolumeSlider with mute toggle and debounced API calls
- QueueList showing upcoming tracks (max 10)
- HistoryList showing played tracks (scrollable, max 20)
- TrackItem reusable component
- All components integrated into main page
- Tab interface for queue/history
- All TypeScript compiles without errors
- Build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/02-playback-core/02-03-SUMMARY.md`
</output>
