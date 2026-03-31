---
phase: 9
plan: 1
title: Voice DJ Synthesis
wave: 1
depends_on: [08-01-database-setup]
files_modified:
  - lib/voice/elevenlabs.ts
  - lib/voice/commentary.ts
  - lib/voice/index.ts
  - lib/stores/voice-store.ts
  - lib/stores/index.ts
  - app/api/voice/route.ts
requirements_addressed: [VOICE-01]
autonomous: true
---

<objective>
Create voice DJ functionality using ElevenLabs for track introductions.

Purpose: AI voice personality introduces tracks with contextual commentary.
Output: Voice synthesis API and playback system.
</objective>

<must_haves>
- ElevenLabs API integration for text-to-speech
- Commentary generation based on track/vibe context
- Voice playback before track starts
- Enable/disable toggle
- Graceful degradation when API unavailable
</must_haves>

<task id="1">
<title>Create ElevenLabs Client</title>
<action>
Create lib/voice/elevenlabs.ts:

```typescript
// ElevenLabs API client for voice synthesis

const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export async function synthesizeSpeech(
  text: string,
  voiceId?: string
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const defaultVoiceId = process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM"; // Rachel

  if (!apiKey) {
    console.warn("ELEVENLABS_API_KEY not configured");
    return null;
  }

  const settings: VoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.5,
    use_speaker_boost: true,
  };

  try {
    const response = await fetch(
      `${ELEVENLABS_API_URL}/text-to-speech/${voiceId || defaultVoiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_monolingual_v1",
          voice_settings: settings,
        }),
      }
    );

    if (!response.ok) {
      console.error("ElevenLabs API error:", response.status);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("Voice synthesis failed:", error);
    return null;
  }
}
```
</action>
<acceptance_criteria>
- Calls ElevenLabs API with text
- Returns audio as ArrayBuffer
- Graceful failure returns null
</acceptance_criteria>
</task>

<task id="2">
<title>Create Commentary Generator</title>
<action>
Create lib/voice/commentary.ts:

```typescript
// Generate DJ commentary for track introductions

interface TrackContext {
  trackName: string;
  artistName: string;
  albumName?: string;
  genres?: string[];
  energy?: number;
  isFirst?: boolean;
}

const INTRO_TEMPLATES = [
  "Here's {artist} with {track}.",
  "Coming up, {track} by {artist}.",
  "Let's keep it going with {artist}.",
  "Next up, {track}.",
  "{artist} bringing the vibes with {track}.",
];

const FIRST_TRACK_TEMPLATES = [
  "Starting off with {artist}, here's {track}.",
  "Kicking things off, it's {track} by {artist}.",
  "Let's set the mood with {artist}.",
];

const ENERGY_COMMENTS: Record<string, string[]> = {
  high: ["Let's turn it up!", "Energy's rising!", "Here we go!"],
  low: ["Taking it smooth.", "Bringing it down a notch.", "Nice and easy."],
  mid: ["Keeping the vibe.", "Staying in the groove.", ""],
};

export function generateCommentary(context: TrackContext): string {
  const templates = context.isFirst ? FIRST_TRACK_TEMPLATES : INTRO_TEMPLATES;
  const template = templates[Math.floor(Math.random() * templates.length)];

  let commentary = template
    .replace("{track}", context.trackName)
    .replace("{artist}", context.artistName);

  // Add energy comment occasionally
  if (context.energy !== undefined && Math.random() > 0.6) {
    const energyLevel = context.energy > 0.7 ? "high" : context.energy < 0.3 ? "low" : "mid";
    const comments = ENERGY_COMMENTS[energyLevel];
    const comment = comments[Math.floor(Math.random() * comments.length)];
    if (comment) {
      commentary = comment + " " + commentary;
    }
  }

  return commentary;
}
```
</action>
<acceptance_criteria>
- Generates varied DJ introductions
- Handles first track differently
- Incorporates energy context
</acceptance_criteria>
</task>

<task id="3">
<title>Create Voice Module Index</title>
<action>
Create lib/voice/index.ts:

```typescript
export { synthesizeSpeech } from "./elevenlabs";
export { generateCommentary } from "./commentary";
```
</action>
<acceptance_criteria>
- Exports voice functions
</acceptance_criteria>
</task>

<task id="4">
<title>Create Voice Store</title>
<action>
Create lib/stores/voice-store.ts:

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface VoiceStore {
  isEnabled: boolean;
  volume: number;
  currentAudio: HTMLAudioElement | null;

  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playVoice: (audioData: ArrayBuffer) => Promise<void>;
  stopVoice: () => void;
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      isEnabled: false, // Disabled by default
      volume: 0.8,
      currentAudio: null,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      playVoice: async (audioData) => {
        const { isEnabled, volume, currentAudio } = get();

        if (!isEnabled) return;

        // Stop any current playback
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.src = "";
        }

        // Create audio from buffer
        const blob = new Blob([audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = volume;

        set({ currentAudio: audio });

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            set({ currentAudio: null });
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            set({ currentAudio: null });
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      },

      stopVoice: () => {
        const { currentAudio } = get();
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.src = "";
          set({ currentAudio: null });
        }
      },
    }),
    {
      name: "vibe-dj-voice",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        volume: state.volume,
      }),
    }
  )
);
```
</action>
<acceptance_criteria>
- Toggle for enable/disable
- Volume control
- Audio playback from ArrayBuffer
- Persists settings to localStorage
</acceptance_criteria>
</task>

<task id="5">
<title>Update Stores Index</title>
<action>
Add to lib/stores/index.ts:

```typescript
export { useVoiceStore } from "./voice-store";
```
</action>
<acceptance_criteria>
- Voice store exported
</acceptance_criteria>
</task>

<task id="6">
<title>Create Voice API Route</title>
<action>
Create app/api/voice/route.ts:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import { generateCommentary } from "@/lib/voice/commentary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackName, artistName, albumName, genres, energy, isFirst } = body;

    if (!trackName || !artistName) {
      return NextResponse.json(
        { error: "trackName and artistName required" },
        { status: 400 }
      );
    }

    // Generate commentary
    const commentary = generateCommentary({
      trackName,
      artistName,
      albumName,
      genres,
      energy,
      isFirst,
    });

    // Synthesize speech
    const audioData = await synthesizeSpeech(commentary);

    if (!audioData) {
      return NextResponse.json(
        { error: "Voice synthesis unavailable", commentary },
        { status: 503 }
      );
    }

    // Return audio as binary
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Commentary": encodeURIComponent(commentary),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```
</action>
<acceptance_criteria>
- POST endpoint generates commentary and audio
- Returns audio/mpeg binary
- Falls back gracefully when API unavailable
</acceptance_criteria>
</task>

<verification>
```bash
npx tsc --noEmit
npm run build
```
</verification>
