---
phase: 1
plan: 1
title: Project Scaffold and Dependencies
wave: 1
depends_on: []
files_modified:
  - package.json
  - tsconfig.json
  - next.config.ts
  - tailwind.config.ts
  - postcss.config.mjs
  - app/layout.tsx
  - app/page.tsx
  - app/globals.css
  - lib/spotify/client.ts
  - lib/spotify/types.ts
  - .env.example
requirements_addressed: []
autonomous: true
---

<objective>
Initialize Next.js 15 project with all Phase 1 dependencies, TypeScript configuration, and base project structure for Spotify integration.

Purpose: Establish the foundational project structure so subsequent plans can build features without setup overhead.
Output: Running Next.js 15 app with Tailwind CSS, configured for Spotify SDK integration.
</objective>

<must_haves>
- Next.js 15 project runs on localhost:3000
- TypeScript configured with strict mode
- Tailwind CSS configured with dark synthwave color palette
- @spotify/web-api-ts-sdk installed and importable
- Zustand and SWR installed for state management
- Base layout with app shell (dark background, no content yet)
- Environment variables documented in .env.example
</must_haves>

<task id="1">
<title>Initialize Next.js 15 with App Router</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/.env.example (existing env template)
</read_first>
<action>
Run create-next-app in the project root (it's currently empty except .planning and .git):

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

This creates:
- Next.js 15 with App Router
- TypeScript with strict config
- Tailwind CSS with PostCSS
- ESLint configuration
- Import alias @/* for clean imports

After scaffolding, verify the structure exists:
- app/layout.tsx
- app/page.tsx
- tailwind.config.ts
- next.config.ts
- package.json
</action>
<acceptance_criteria>
- `package.json` contains `"next": "15` (version 15.x)
- `package.json` contains `"react": "19` (React 19.x bundled with Next 15)
- `package.json` contains `"typescript": "5` (TypeScript 5.x)
- `app/layout.tsx` exists
- `app/page.tsx` exists
- `tailwind.config.ts` exists
- `npm run dev` starts without errors (verify process exits 0 for build check: `npm run build`)
</acceptance_criteria>
</task>

<task id="2">
<title>Install Phase 1 Dependencies</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/package.json (after task 1)
</read_first>
<action>
Install all dependencies needed for Phase 1 (Spotify Foundation):

```bash
npm install @spotify/web-api-ts-sdk zustand swr framer-motion
npm install -D @types/node
```

Package purposes:
- @spotify/web-api-ts-sdk: Official Spotify SDK with PKCE auth built-in
- zustand: Client-side state management (auth state, playback state)
- swr: Server-state polling with automatic revalidation (playback polling)
- framer-motion: Animation library (used throughout, install now)
- @types/node: Node.js types for API routes
</action>
<acceptance_criteria>
- `package.json` contains `"@spotify/web-api-ts-sdk":`
- `package.json` contains `"zustand":`
- `package.json` contains `"swr":`
- `package.json` contains `"framer-motion":`
- `npm ls @spotify/web-api-ts-sdk` exits with code 0 (package installed correctly)
</acceptance_criteria>
</task>

<task id="3">
<title>Configure Tailwind Dark Synthwave Theme</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/tailwind.config.ts (after task 1)
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/globals.css (after task 1)
</read_first>
<action>
Update tailwind.config.ts to extend colors with synthwave palette:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark synthwave palette from CLAUDE.md
        background: "#18181b",  // Warm dark (zinc-900)
        foreground: "#fafafa",  // Light text
        primary: {
          DEFAULT: "#7c3aed",   // Purple (violet-600)
          dark: "#5b21b6",      // Darker purple
        },
        accent: {
          magenta: "#ec4899",   // Pink-500
          cyan: "#06b6d4",      // Cyan-500
        },
        surface: {
          DEFAULT: "#27272a",   // Card background (zinc-800)
          elevated: "#3f3f46",  // Elevated surface (zinc-700)
        },
      },
      fontFamily: {
        display: ["Instrument Serif", "serif"],
        sans: ["Satoshi", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

Update app/globals.css to set base dark mode and import fonts:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 24 24 27;
    --foreground: 250 250 250;
  }

  body {
    @apply bg-background text-foreground antialiased;
  }
}
```
</action>
<acceptance_criteria>
- `tailwind.config.ts` contains `background: "#18181b"`
- `tailwind.config.ts` contains `primary: {` with `DEFAULT: "#7c3aed"`
- `tailwind.config.ts` contains `accent: {` with `magenta: "#ec4899"` and `cyan: "#06b6d4"`
- `app/globals.css` contains `bg-background text-foreground`
</acceptance_criteria>
</task>

<task id="4">
<title>Create Base Spotify Client Types and Stub</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/CLAUDE.md (architecture decisions)
</read_first>
<action>
Create the Spotify client module structure:

Create lib/spotify/types.ts:
```typescript
// Spotify API types for Vibe DJ
// Using @spotify/web-api-ts-sdk types where possible, extending where needed

import { SpotifyApi, AccessToken } from "@spotify/web-api-ts-sdk";

// Re-export SDK types we'll use frequently
export type { SpotifyApi, AccessToken };

// App-specific token state
export interface TokenState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp in ms
}

// Device types for Spotify Connect
export interface SpotifyDevice {
  id: string | null;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string; // "Computer", "Smartphone", "Speaker", etc.
  volume_percent: number | null;
  supports_volume: boolean;
}

// Playback state (subset of SDK's PlaybackState)
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

Create lib/spotify/client.ts:
```typescript
// Singleton Spotify client wrapper
// Handles PKCE auth flow and token refresh per CLAUDE.md architecture

import { SpotifyApi } from "@spotify/web-api-ts-sdk";

// Will be initialized after OAuth callback
let spotifyClient: SpotifyApi | null = null;

// Proactive refresh threshold: 50 minutes (before 60 min expiry)
const REFRESH_THRESHOLD_MS = 50 * 60 * 1000;

export function getSpotifyClient(): SpotifyApi | null {
  return spotifyClient;
}

export function setSpotifyClient(client: SpotifyApi): void {
  spotifyClient = client;
}

export function clearSpotifyClient(): void {
  spotifyClient = null;
}

// Check if token needs refresh (within threshold of expiry)
export function shouldRefreshToken(expiresAt: number): boolean {
  const now = Date.now();
  return expiresAt - now < REFRESH_THRESHOLD_MS;
}
```

Create lib/spotify/index.ts (barrel export):
```typescript
export * from "./types";
export * from "./client";
```
</action>
<acceptance_criteria>
- `lib/spotify/types.ts` contains `export interface TokenState {`
- `lib/spotify/types.ts` contains `export interface SpotifyDevice {`
- `lib/spotify/types.ts` contains `export interface PlaybackState {`
- `lib/spotify/client.ts` contains `const REFRESH_THRESHOLD_MS = 50 * 60 * 1000`
- `lib/spotify/client.ts` contains `export function getSpotifyClient()`
- `lib/spotify/index.ts` contains `export * from "./types"`
- TypeScript compiles without errors: `npx tsc --noEmit` exits 0
</acceptance_criteria>
</task>

<task id="5">
<title>Create Base App Layout and Shell</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/layout.tsx (after task 1)
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/app/page.tsx (after task 1)
</read_first>
<action>
Update app/layout.tsx with metadata and base structure:

```typescript
import type { Metadata } from "next";
import "./globals.css";

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
          {children}
        </main>
      </body>
    </html>
  );
}
```

Update app/page.tsx with placeholder for auth state:

```typescript
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
        <p className="text-foreground/70">
          Connect to Spotify to get started
        </p>
        {/* Login button will be added in Plan 02 */}
        <div className="h-12 w-48 mx-auto rounded-lg bg-surface animate-pulse" />
      </div>
    </div>
  );
}
```
</action>
<acceptance_criteria>
- `app/layout.tsx` contains `title: "Vibe DJ"`
- `app/layout.tsx` contains `className="dark"`
- `app/layout.tsx` contains `bg-background font-sans`
- `app/page.tsx` contains `<h1 className="text-4xl font-display text-primary">Vibe DJ</h1>`
- `npm run build` completes without errors (exit code 0)
</acceptance_criteria>
</task>

<task id="6">
<title>Update Environment Variables Template</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/.env.example
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/CLAUDE.md (env vars section)
</read_first>
<action>
Update .env.example to match CLAUDE.md specification exactly. Ensure all Phase 1 variables are documented:

```bash
# ==========================================
# Vibe DJ Environment Variables
# ==========================================
# Copy to .env.local and fill in values

# Required - Spotify (Phase 1)
SPOTIFY_CLIENT_ID=                   # From Spotify Developer Dashboard
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=       # Same as above, exposed to browser for PKCE
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# Required - Anthropic (Phase 4)
ANTHROPIC_API_KEY=sk-ant-            # From Anthropic Console

# Optional - ElevenLabs Voice DJ (Phase 9)
ELEVENLABS_API_KEY=sk_               # From ElevenLabs Dashboard
ELEVENLABS_VOICE_ID=                 # Selected voice ID

# Database (Phase 7+)
DATABASE_URL=file:./data/vibe-dj.db

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Note: SPOTIFY_CLIENT_SECRET is NOT needed for PKCE flow (browser-safe auth).
</action>
<acceptance_criteria>
- `.env.example` contains `SPOTIFY_CLIENT_ID=`
- `.env.example` contains `NEXT_PUBLIC_SPOTIFY_CLIENT_ID=`
- `.env.example` contains `SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify`
- `.env.example` does NOT contain `SPOTIFY_CLIENT_SECRET` (PKCE flow doesn't need it)
- `.env.example` contains `NEXT_PUBLIC_APP_URL=`
</acceptance_criteria>
</task>

<verification>
Run these commands to verify scaffold is complete:

```bash
# 1. Dependencies installed
npm ls @spotify/web-api-ts-sdk zustand swr framer-motion

# 2. TypeScript compiles
npx tsc --noEmit

# 3. Build succeeds
npm run build

# 4. Dev server starts (manual check)
npm run dev
# Visit http://localhost:3000 - should see "Vibe DJ" title on dark background
```
</verification>
