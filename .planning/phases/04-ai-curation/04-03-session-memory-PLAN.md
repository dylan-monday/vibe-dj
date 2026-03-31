---
phase: 4
plan: 3
title: Session Memory Store
wave: 1
depends_on: []
files_modified:
  - lib/stores/session-store.ts
  - lib/stores/index.ts
requirements_addressed: [CURA-04]
autonomous: true
---

<objective>
Create session memory store that tracks played tracks, exclusions, and vibe context.

Purpose: Prevent track repeats, remember exclusions throughout session, maintain conversation context.
Output: Zustand store with sessionStorage persistence for session memory.
</objective>

<must_haves>
- Track played track IDs (no repeats)
- Track excluded genres and artists
- Store recent vibe interpretations (last 5)
- Persist across page reloads (sessionStorage)
- Clear on session end
- Limit storage size to prevent overflow
</must_haves>

<task id="1">
<title>Create Session Memory Store</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/chat-store.ts (for pattern)
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/chat/types.ts (VibeInterpretation)
</read_first>
<action>
Create lib/stores/session-store.ts:

```typescript
// Session memory store for AI curation
// Tracks played tracks, exclusions, and vibe context

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VibeInterpretation } from "@/lib/chat/types";

interface SessionMemory {
  // Tracks played this session (IDs only to save space)
  playedTrackIds: string[];

  // Excluded genres (accumulated from all vibes)
  excludedGenres: string[];

  // Excluded artists (accumulated from all vibes)
  excludedArtists: string[];

  // Recent vibe interpretations (last 5)
  recentVibes: VibeInterpretation[];

  // Session start time
  sessionStartedAt: number;

  // Recommendation session for seed rotation
  usedSeeds: {
    artists: string[];
    tracks: string[];
    genres: string[];
  };
}

interface SessionStore extends SessionMemory {
  // Actions
  addPlayedTrack: (trackId: string) => void;
  addPlayedTracks: (trackIds: string[]) => void;
  hasPlayedTrack: (trackId: string) => boolean;

  addExclusion: (type: "genre" | "artist", value: string) => void;
  addExclusions: (genres: string[], artists: string[]) => void;

  addVibe: (vibe: VibeInterpretation) => void;
  getLatestVibe: () => VibeInterpretation | null;

  addUsedSeed: (type: "artist" | "track" | "genre", value: string) => void;
  hasUsedSeed: (type: "artist" | "track" | "genre", value: string) => boolean;

  clearSession: () => void;
  getSessionContext: () => {
    playedTrackIds: string[];
    excludedGenres: string[];
    excludedArtists: string[];
    previousVibes: VibeInterpretation[];
  };
}

const initialState: SessionMemory = {
  playedTrackIds: [],
  excludedGenres: [],
  excludedArtists: [],
  recentVibes: [],
  sessionStartedAt: Date.now(),
  usedSeeds: {
    artists: [],
    tracks: [],
    genres: [],
  },
};

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Add a single played track
      addPlayedTrack: (trackId) => {
        set((state) => {
          if (state.playedTrackIds.includes(trackId)) return state;
          // Limit to 500 tracks to prevent storage overflow
          const newIds = [...state.playedTrackIds, trackId].slice(-500);
          return { playedTrackIds: newIds };
        });
      },

      // Add multiple played tracks
      addPlayedTracks: (trackIds) => {
        set((state) => {
          const existingSet = new Set(state.playedTrackIds);
          const newIds = trackIds.filter((id) => !existingSet.has(id));
          if (newIds.length === 0) return state;
          const combined = [...state.playedTrackIds, ...newIds].slice(-500);
          return { playedTrackIds: combined };
        });
      },

      // Check if track was already played
      hasPlayedTrack: (trackId) => {
        return get().playedTrackIds.includes(trackId);
      },

      // Add a genre or artist exclusion
      addExclusion: (type, value) => {
        const normalized = value.toLowerCase().trim();
        set((state) => {
          if (type === "genre") {
            if (state.excludedGenres.includes(normalized)) return state;
            return {
              excludedGenres: [...state.excludedGenres, normalized].slice(-50),
            };
          } else {
            if (state.excludedArtists.includes(normalized)) return state;
            return {
              excludedArtists: [...state.excludedArtists, normalized].slice(-50),
            };
          }
        });
      },

      // Add multiple exclusions at once
      addExclusions: (genres, artists) => {
        set((state) => {
          const newGenres = genres
            .map((g) => g.toLowerCase().trim())
            .filter((g) => !state.excludedGenres.includes(g));
          const newArtists = artists
            .map((a) => a.toLowerCase().trim())
            .filter((a) => !state.excludedArtists.includes(a));

          if (newGenres.length === 0 && newArtists.length === 0) return state;

          return {
            excludedGenres: [...state.excludedGenres, ...newGenres].slice(-50),
            excludedArtists: [...state.excludedArtists, ...newArtists].slice(-50),
          };
        });
      },

      // Add a vibe interpretation
      addVibe: (vibe) => {
        set((state) => {
          // Keep last 5 vibes
          const newVibes = [...state.recentVibes, vibe].slice(-5);

          // Also accumulate exclusions from the vibe
          const newExcludedGenres = [
            ...state.excludedGenres,
            ...vibe.exclusions.genres
              .map((g) => g.toLowerCase())
              .filter((g) => !state.excludedGenres.includes(g)),
          ].slice(-50);

          const newExcludedArtists = [
            ...state.excludedArtists,
            ...vibe.exclusions.artists
              .map((a) => a.toLowerCase())
              .filter((a) => !state.excludedArtists.includes(a)),
          ].slice(-50);

          return {
            recentVibes: newVibes,
            excludedGenres: newExcludedGenres,
            excludedArtists: newExcludedArtists,
          };
        });
      },

      // Get the most recent vibe
      getLatestVibe: () => {
        const vibes = get().recentVibes;
        return vibes.length > 0 ? vibes[vibes.length - 1] : null;
      },

      // Track used seeds for rotation
      addUsedSeed: (type, value) => {
        const normalized = value.toLowerCase();
        set((state) => {
          const key = `${type}s` as keyof typeof state.usedSeeds;
          if (state.usedSeeds[key].includes(normalized)) return state;
          return {
            usedSeeds: {
              ...state.usedSeeds,
              [key]: [...state.usedSeeds[key], normalized].slice(-20),
            },
          };
        });
      },

      // Check if seed was already used
      hasUsedSeed: (type, value) => {
        const normalized = value.toLowerCase();
        const key = `${type}s` as keyof ReturnType<typeof get>["usedSeeds"];
        return get().usedSeeds[key].includes(normalized);
      },

      // Clear session (on logout or manual clear)
      clearSession: () => {
        set({ ...initialState, sessionStartedAt: Date.now() });
      },

      // Get context for AI interpretation
      getSessionContext: () => {
        const state = get();
        return {
          playedTrackIds: state.playedTrackIds,
          excludedGenres: state.excludedGenres,
          excludedArtists: state.excludedArtists,
          previousVibes: state.recentVibes,
        };
      },
    }),
    {
      name: "vibe-dj-session",
      storage: createJSONStorage(() => sessionStorage),
      // Persist everything
      partialize: (state) => ({
        playedTrackIds: state.playedTrackIds,
        excludedGenres: state.excludedGenres,
        excludedArtists: state.excludedArtists,
        recentVibes: state.recentVibes,
        sessionStartedAt: state.sessionStartedAt,
        usedSeeds: state.usedSeeds,
      }),
    }
  )
);
```
</action>
<acceptance_criteria>
- `lib/stores/session-store.ts` exists
- Tracks played track IDs (limited to 500)
- Tracks excluded genres and artists (limited to 50 each)
- Stores recent vibes (last 5)
- Tracks used seeds for rotation
- Uses sessionStorage persistence
- Provides getSessionContext for AI calls
</acceptance_criteria>
</task>

<task id="2">
<title>Update Store Index Exports</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/stores/index.ts
</read_first>
<action>
Update lib/stores/index.ts to export session store:

Add this export:
```typescript
export { useSessionStore } from "./session-store";
```
</action>
<acceptance_criteria>
- lib/stores/index.ts exports useSessionStore
- TypeScript compiles without errors
</acceptance_criteria>
</task>

<verification>
Run these commands to verify session memory store is complete:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Build succeeds
npm run build

# 3. File exists
ls -la lib/stores/session-store.ts
```
</verification>
