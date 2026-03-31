---
phase: 02-playback-core
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - components/player/now-playing.tsx
  - components/player/album-art.tsx
  - components/player/progress-bar.tsx
  - components/player/index.ts
  - app/page.tsx
autonomous: true
requirements:
  - PLAY-01
  - UI-01

must_haves:
  truths:
    - "Album art displays prominently as hero element"
    - "Track title and artist name are visible"
    - "Progress bar shows elapsed time and total duration"
    - "Progress bar updates smoothly (interpolated between polls)"
    - "Nothing playing state handled gracefully"
    - "Touch targets are minimum 44x44px on mobile"
  artifacts:
    - path: "components/player/now-playing.tsx"
      provides: "Main now playing container"
      exports: ["NowPlaying"]
    - path: "components/player/album-art.tsx"
      provides: "Album art hero component"
      exports: ["AlbumArt"]
    - path: "components/player/progress-bar.tsx"
      provides: "Playback progress bar with time display"
      exports: ["ProgressBar"]
  key_links:
    - from: "components/player/now-playing.tsx"
      to: "lib/stores/playback-store.ts"
      via: "usePlaybackStore hook"
      pattern: "usePlaybackStore"
    - from: "components/player/progress-bar.tsx"
      to: "lib/stores/playback-store.ts"
      via: "progressMs and durationMs state"
      pattern: "progressMs|durationMs"
---

<objective>
Create the Now Playing UI with album art as hero element, track info display, and smooth progress bar.

Purpose: This is the primary visual feedback for playback state. Users need to see what's playing with album art prominent, track details visible, and progress updating in real-time. Mobile-first design with touch-friendly sizing.

Output: NowPlaying component with AlbumArt hero, track info, and interpolated ProgressBar.
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

# Existing components
@components/player/device-picker.tsx
@app/page.tsx

<interfaces>
<!-- Types from Plan 01 (being built in parallel) -->

From lib/spotify/types.ts:
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

From lib/stores/playback-store.ts (expanded in Plan 01):
```typescript
// State the UI will consume
currentTrack: PlaybackState['track'] | null;
isPlaying: boolean;
progressMs: number;
durationMs: number;
volume: number;
lastPolledAt: number | null;
isStale: boolean;
```

Design tokens from globals.css:
```css
--color-background: #18181b;
--color-foreground: #fafafa;
--color-primary: #7c3aed;
--color-accent-magenta: #ec4899;
--color-accent-cyan: #06b6d4;
--color-surface: #27272a;
--color-surface-elevated: #3f3f46;
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create AlbumArt hero component</name>
  <files>components/player/album-art.tsx</files>
  <read_first>
    - app/globals.css (design tokens)
    - tailwind.config.ts (color palette)
    - components/player/device-picker.tsx (component style reference)
  </read_first>
  <action>
Create `components/player/album-art.tsx`:

```typescript
"use client";

import Image from "next/image";

interface AlbumArtProps {
  imageUrl: string | null;
  albumName: string;
  size?: "sm" | "md" | "lg" | "hero";
}

export function AlbumArt({ imageUrl, albumName, size = "hero" }: AlbumArtProps) {
  // Size mapping - hero is the primary mobile-first size
  const sizeClasses = {
    sm: "w-12 h-12",        // 48px - for queue items
    md: "w-16 h-16",        // 64px - for history items
    lg: "w-24 h-24",        // 96px - for detail views
    hero: "w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] aspect-square",
  };

  // Placeholder when no image
  if (!imageUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg bg-surface-elevated flex items-center justify-center`}
        role="img"
        aria-label={`Album art for ${albumName}`}
      >
        <svg
          className="w-1/3 h-1/3 text-foreground/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} relative rounded-lg overflow-hidden shadow-2xl`}
    >
      <Image
        src={imageUrl}
        alt={`Album art for ${albumName}`}
        fill
        className="object-cover"
        sizes={size === "hero" ? "(max-width: 640px) 280px, (max-width: 768px) 320px, 400px" : undefined}
        priority={size === "hero"}
      />
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}
```

Key design decisions:
- Hero size is responsive: 280px mobile, 320px tablet, 400px desktop
- Aspect ratio maintained with aspect-square
- Shadow for depth (synthwave aesthetic)
- Subtle gradient overlay
- Placeholder with music note icon when no image
- Next.js Image for optimization
  </action>
  <verify>
    <automated>grep -n "export function AlbumArt" components/player/album-art.tsx && grep -n "hero" components/player/album-art.tsx && grep -n "aspect-square" components/player/album-art.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function AlbumArt" components/player/album-art.tsx returns match
    - grep "max-w-\[280px\]" components/player/album-art.tsx returns match (mobile size)
    - grep "aspect-square" components/player/album-art.tsx returns match
    - grep "shadow-2xl" components/player/album-art.tsx returns match
    - npm run type-check passes
  </acceptance_criteria>
  <done>AlbumArt component with hero sizing, placeholder state, and responsive breakpoints</done>
</task>

<task type="auto">
  <name>Task 2: Create ProgressBar component with time interpolation</name>
  <files>components/player/progress-bar.tsx</files>
  <read_first>
    - app/globals.css (design tokens)
    - lib/spotify/types.ts (PlaybackState for reference)
  </read_first>
  <action>
Create `components/player/progress-bar.tsx`:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";

interface ProgressBarProps {
  progressMs: number;
  durationMs: number;
  isPlaying: boolean;
  onSeek?: (positionMs: number) => void;
}

// Format milliseconds to mm:ss
function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function ProgressBar({
  progressMs,
  durationMs,
  isPlaying,
  onSeek,
}: ProgressBarProps) {
  // Local state for smooth interpolation between polls
  const [localProgress, setLocalProgress] = useState(progressMs);
  const animationRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  // Sync with server progress when it changes
  useEffect(() => {
    setLocalProgress(progressMs);
    lastUpdateRef.current = Date.now();
  }, [progressMs]);

  // Interpolate progress when playing
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastUpdateRef.current;
      lastUpdateRef.current = now;

      setLocalProgress((prev) => {
        const next = prev + elapsed;
        return Math.min(next, durationMs);
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, durationMs]);

  const percent = durationMs > 0 ? (localProgress / durationMs) * 100 : 0;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || durationMs === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const seekMs = Math.floor(percent * durationMs);
    onSeek(seekMs);
  };

  // Touch-friendly: min height 44px for tap target
  return (
    <div className="w-full space-y-2">
      {/* Progress bar track */}
      <div
        className="relative h-2 bg-surface-elevated rounded-full overflow-hidden cursor-pointer touch-manipulation"
        onClick={handleClick}
        role="slider"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={localProgress}
        tabIndex={0}
        style={{ minHeight: "44px", display: "flex", alignItems: "center" }}
      >
        {/* Inner track (actual 8px height, centered for touch target) */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-surface-elevated rounded-full overflow-hidden">
          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-primary to-accent-magenta rounded-full transition-none"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Time display */}
      <div className="flex justify-between text-xs text-foreground/60 font-mono">
        <span>{formatTime(localProgress)}</span>
        <span>{formatTime(durationMs)}</span>
      </div>
    </div>
  );
}
```

Key features:
- requestAnimationFrame for smooth 60fps interpolation
- Syncs with server progressMs on update
- Touch target is 44px minimum (bar appears 8px, hit area larger)
- Gradient fill matching synthwave aesthetic
- Click/tap to seek
- Mono font for time display (aligned digits)
  </action>
  <verify>
    <automated>grep -n "export function ProgressBar" components/player/progress-bar.tsx && grep -n "requestAnimationFrame" components/player/progress-bar.tsx && grep -n "formatTime" components/player/progress-bar.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function ProgressBar" components/player/progress-bar.tsx returns match
    - grep "requestAnimationFrame" components/player/progress-bar.tsx returns match (interpolation)
    - grep "44px" components/player/progress-bar.tsx returns match (touch target)
    - grep "from-primary to-accent-magenta" components/player/progress-bar.tsx returns match (gradient)
    - npm run type-check passes
  </acceptance_criteria>
  <done>ProgressBar with smooth interpolation, touch-friendly sizing, seek support</done>
</task>

<task type="auto">
  <name>Task 3: Create NowPlaying container component</name>
  <files>components/player/now-playing.tsx, components/player/index.ts</files>
  <read_first>
    - components/player/album-art.tsx (just created)
    - components/player/progress-bar.tsx (just created)
    - lib/stores/playback-store.ts (state shape)
  </read_first>
  <action>
Create `components/player/now-playing.tsx`:

```typescript
"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";
import { AlbumArt } from "./album-art";
import { ProgressBar } from "./progress-bar";

export function NowPlaying() {
  const {
    currentTrack,
    isPlaying,
    progressMs,
    durationMs,
    isStale,
    seekTo,
  } = usePlaybackStore();

  // Nothing playing state
  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <AlbumArt imageUrl={null} albumName="Nothing playing" size="hero" />
        <div className="text-center space-y-2">
          <p className="text-xl text-foreground/70">Nothing playing</p>
          <p className="text-sm text-foreground/50">
            Start playing music on Spotify to see it here
          </p>
        </div>
      </div>
    );
  }

  // Get best quality album image (first is usually largest)
  const albumImageUrl = currentTrack.album.images[0]?.url || null;

  // Format artist names
  const artistNames = currentTrack.artists.map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col items-center space-y-6 px-4">
      {/* Stale indicator - subtle, non-intrusive */}
      {isStale && (
        <div className="absolute top-4 right-4 flex items-center gap-1 text-xs text-foreground/40">
          <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
          <span>Syncing...</span>
        </div>
      )}

      {/* Album art hero */}
      <AlbumArt
        imageUrl={albumImageUrl}
        albumName={currentTrack.album.name}
        size="hero"
      />

      {/* Track info */}
      <div className="w-full max-w-[400px] text-center space-y-1">
        <h2 className="text-xl sm:text-2xl font-display text-foreground truncate">
          {currentTrack.name}
        </h2>
        <p className="text-base text-foreground/70 truncate">{artistNames}</p>
        <p className="text-sm text-foreground/50 truncate">
          {currentTrack.album.name}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[400px]">
        <ProgressBar
          progressMs={progressMs}
          durationMs={currentTrack.durationMs}
          isPlaying={isPlaying}
          onSeek={seekTo}
        />
      </div>
    </div>
  );
}
```

Update `components/player/index.ts`:
```typescript
export { DevicePicker } from "./device-picker";
export { NowPlaying } from "./now-playing";
export { AlbumArt } from "./album-art";
export { ProgressBar } from "./progress-bar";
```

Design notes:
- Album art centered as hero
- Track title uses display font (Instrument Serif)
- Artist and album in muted colors
- Width constrained to 400px max for readability
- Stale indicator subtle, non-alarming
- Mobile-first spacing (space-y-6)
  </action>
  <verify>
    <automated>grep -n "export function NowPlaying" components/player/now-playing.tsx && grep -n "currentTrack" components/player/now-playing.tsx && grep -n "font-display" components/player/now-playing.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "export function NowPlaying" components/player/now-playing.tsx returns match
    - grep "usePlaybackStore" components/player/now-playing.tsx returns match
    - grep "AlbumArt" components/player/now-playing.tsx returns match
    - grep "ProgressBar" components/player/now-playing.tsx returns match
    - grep "Nothing playing" components/player/now-playing.tsx returns match (empty state)
    - npm run type-check passes
  </acceptance_criteria>
  <done>NowPlaying container with album art hero, track info, progress bar, and empty state</done>
</task>

<task type="auto">
  <name>Task 4: Integrate NowPlaying into main page layout</name>
  <files>app/page.tsx</files>
  <read_first>
    - app/page.tsx (current structure)
    - components/player/now-playing.tsx (just created)
    - lib/hooks/use-playback-polling.ts (Plan 01 creates this)
  </read_first>
  <action>
Update `app/page.tsx` to show NowPlaying when authenticated:

```typescript
"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { LoginButton, LogoutButton } from "@/components/auth";
import { DevicePicker, NowPlaying } from "@/components/player";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { activeDevice, currentTrack } = usePlaybackStore();

  // Start polling when authenticated
  // This hook handles Page Visibility and interval management
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
      {/* Header - minimal, semi-transparent */}
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

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        {/* Now Playing - hero section */}
        <section className="flex-1 flex flex-col justify-center py-8">
          <NowPlaying />
        </section>

        {/* Controls will be added in Plan 03 */}
        {/* Placeholder for now */}
        <section className="pb-safe">
          <div className="max-w-md mx-auto px-4 py-4">
            {/* Device picker collapsed by default when device selected */}
            {!activeDevice && (
              <div className="mb-4">
                <DevicePicker />
              </div>
            )}

            {currentTrack && (
              <p className="text-center text-foreground/40 text-sm">
                Controls coming in next plan
              </p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
```

Key changes:
- Call usePlaybackPolling() to start polling
- NowPlaying as hero section
- Header is sticky with backdrop blur
- Device picker shown only when no device selected
- Mobile-first layout with flex-col
- pb-safe for iOS safe area padding
  </action>
  <verify>
    <automated>grep -n "usePlaybackPolling" app/page.tsx && grep -n "NowPlaying" app/page.tsx && grep -n "backdrop-blur" app/page.tsx</automated>
  </verify>
  <acceptance_criteria>
    - grep "usePlaybackPolling" app/page.tsx returns match
    - grep "NowPlaying" app/page.tsx returns match (import and usage)
    - grep "backdrop-blur" app/page.tsx returns match (header styling)
    - grep "sticky top-0" app/page.tsx returns match (header position)
    - npm run type-check passes
    - npm run build passes
  </acceptance_criteria>
  <done>Main page integrates NowPlaying with polling, responsive layout, sticky header</done>
</task>

</tasks>

<verification>
After all tasks:
1. `npm run type-check` - No TypeScript errors
2. `npm run build` - Build succeeds
3. Visual verification checklist:
   - Album art displays at responsive sizes
   - Track info shows title, artist, album
   - Progress bar shows time and fills
   - Nothing playing state displays placeholder
   - Header is sticky on scroll
</verification>

<success_criteria>
- AlbumArt component with hero sizing and placeholder
- ProgressBar with smooth interpolation and touch targets
- NowPlaying container with all elements composed
- Main page layout updated with polling integration
- Mobile-first responsive design
- All TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/phases/02-playback-core/02-02-SUMMARY.md`
</output>
