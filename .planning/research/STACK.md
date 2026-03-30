# Technology Stack Research

**Project:** Vibe DJ - AI Music Curator
**Researched:** 2026-03-30
**Confidence:** MEDIUM (web tools unavailable, relying on January 2025 knowledge + one verified source)

## Executive Summary

For an AI-powered music curator with real-time Spotify playback, voice synthesis, and conversational AI, the 2025/2026 stack centers on Next.js 15 (App Router), the official Spotify Web API TypeScript SDK, Anthropic SDK v0.80.0 (verified), and ElevenLabs SDK. SQLite via better-sqlite3 handles local persistence. This stack prioritizes type safety, modern React patterns, and zero-cost deployment options.

**Critical decision:** Use Spotify's official TypeScript SDK (`@spotify/web-api-ts-sdk`) instead of wrapper libraries like `spotify-web-api-node` — the official SDK has better type safety and OAuth PKCE support required for browser-based auth.

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Next.js** | 15.x | Full-stack React framework | App Router is stable, server actions simplify API routes, built-in TypeScript support, Vercel-optimized |
| **React** | 19.x | UI library | Bundled with Next.js 15, concurrent features for smooth playback UI |
| **TypeScript** | 5.4+ | Type safety | Required for Spotify SDK, catches API contract issues at compile time |
| **Node.js** | 20 LTS | Runtime | Required for better-sqlite3 native bindings, LTS support through 2026 |

**Confidence:** MEDIUM (versions based on January 2025 knowledge, Next.js 15 was in RC)

**Rationale:**
- Next.js 15 App Router eliminates client/server boundary confusion with clear `'use client'` directives
- Server Actions simplify Spotify OAuth token refresh without separate API routes
- React Server Components keep Spotify API calls server-side where tokens are safer
- TypeScript prevents runtime errors from Spotify API response changes

### API Integration Layer

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **@spotify/web-api-ts-sdk** | 1.2+ | Spotify API client | Official SDK, PKCE auth built-in, full TypeScript types, actively maintained |
| **@anthropic-ai/sdk** | 0.80.0 | Claude API client | Verified latest (March 2026), streaming support, TypeScript-first |
| **elevenlabs** | 0.x | Voice synthesis | Official SDK, streaming audio, voice cloning support |

**Confidence:** HIGH for Anthropic SDK (verified), MEDIUM for others (January 2025 knowledge)

**Rationale:**
- **Spotify SDK:** Handles OAuth PKCE flow (required for browser apps), automatic token refresh, typed responses. Avoid `spotify-web-api-node` (server-only, no PKCE).
- **Anthropic SDK:** Direct API access, structured JSON outputs via `response_format`, streaming for long responses.
- **ElevenLabs SDK:** Pre-generate audio during previous track to hide 1-3s latency.

### Database & Persistence

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **better-sqlite3** | 11.x | SQLite driver | Synchronous API (simpler), fastest SQLite binding, production-ready |
| **Drizzle ORM** | 0.35+ | Type-safe queries | Zero runtime overhead, TypeScript schema = DB schema, better DX than raw SQL |

**Confidence:** MEDIUM (versions based on January 2025 knowledge)

**Rationale:**
- **better-sqlite3 over node-sqlite3:** Synchronous API avoids callback hell, 2-3x faster, simpler error handling.
- **Drizzle over Prisma:** No code generation step, smaller bundle, no migration confusion for single-user DB.
- **SQLite over PostgreSQL:** Zero hosting cost, local-first, sufficient for single user, 1TB+ capacity (taste profiles are tiny).

**Alternative considered:** Prisma (rejected due to code generation overhead and migration complexity for local DB)

### Styling & Animation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Tailwind CSS** | 4.x | Utility-first CSS | Fast iteration, dark mode built-in, no runtime cost, JIT compiler |
| **Framer Motion** | 11.x | Animation library | Spring physics (spec requirement), gesture tracking, layout animations |
| **@radix-ui/colors** | 3.x | Color system | Accessible dark mode scales, perceptually uniform, pairs with synthwave aesthetic |

**Confidence:** MEDIUM (versions based on January 2025 knowledge)

**Rationale:**
- **Tailwind 4:** Oxide engine (Rust-based) for faster builds, native cascade layers, better dark mode.
- **Framer Motion:** Only library with spring physics + gesture tracking. Required for spec's "crossfades everywhere" and "disappearing interface".
- **Radix Colors:** Generates accessible purple/magenta/cyan scales for synthwave aesthetic.

**Alternatives considered:**
- Motion One (rejected: no gesture tracking)
- React Spring (rejected: less intuitive API)

### Real-Time State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Zustand** | 4.x | Client state | Simple, no boilerplate, perfect for playback state, dev tools support |
| **SWR** or **TanStack Query** | Latest | Server state | Automatic polling, cache management, optimistic updates |

**Confidence:** MEDIUM (versions based on January 2025 knowledge)

**Rationale:**
- **Zustand over Redux:** No actions/reducers boilerplate, simpler mental model, sufficient for single-user app.
- **SWR vs TanStack Query:** Both handle Spotify polling well. SWR is lighter (9KB vs 40KB), TanStack Query has better dev tools. Recommend **SWR** for simplicity.
- **Why not context alone:** Spotify player state updates every 3-5 seconds — need automatic polling + cache invalidation.

### Audio & Media

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Spotify Web Playback SDK** | N/A | Browser playback | Official SDK, Spotify Connect integration, free with Premium |
| **Howler.js** | 2.2+ | Voice DJ audio | Crossfading, pre-loading, sprite support for short clips |

**Confidence:** MEDIUM (versions based on January 2025 knowledge)

**Rationale:**
- **Spotify Web Playback SDK:** Required for Spotify Connect (routes to Sonos). Handles playback, no manual audio management.
- **Howler.js:** ElevenLabs returns audio buffers — Howler handles playback, crossfading between tracks, pre-loading next intro.

### Development & Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **pnpm** | 9.x | Package manager | Faster than npm, disk-efficient, strict dependency resolution |
| **Biome** | 1.9+ | Linter + formatter | Rust-based (100x faster), replaces ESLint + Prettier, zero config |
| **Vitest** | 2.x | Test runner | Fast, Vite-based, compatible with Jest API |

**Confidence:** MEDIUM (versions based on January 2025 knowledge)

**Rationale:**
- **pnpm:** Saves disk space (symlinks), prevents phantom dependencies, faster installs.
- **Biome:** Single tool replaces ESLint + Prettier, negligible config, instant linting.
- **Vitest:** Native ESM, faster than Jest, watch mode is superior for TDD.

### Deployment & Hosting

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Vercel** | N/A | Primary hosting | Native Next.js support, zero-config, edge functions, free tier sufficient |
| **Docker** + **Caddy** | Latest | Self-hosted option | Zero cost on Mac Mini, automatic HTTPS, SQLite-friendly |

**Confidence:** HIGH (deployment patterns are stable)

**Rationale:**
- **Vercel primary:** Serverless scales to zero, free tier includes 100GB bandwidth (sufficient for personal use), instant deploys.
- **Self-hosted option:** Mac Mini runs 24/7, Docker ensures consistency, Caddy auto-renews Let's Encrypt certs.
- **SQLite caveat:** Vercel's serverless is ephemeral — use Vercel Blob for SQLite file OR self-host for true local-first.

**Decision point:** If taste profiles are critical, self-host. If skippable for v1, Vercel + Vercel Blob.

## Alternatives Considered

### Spotify API Clients

| Option | Why Not |
|--------|---------|
| **spotify-web-api-node** | Server-only auth flow, no PKCE support, requires client secret (unsafe in browser) |
| **spotify-web-api-js** | Outdated (last update 2019), no TypeScript, manual token refresh |
| **Direct fetch()** | No type safety, manual OAuth flow, reinventing token refresh logic |

**Recommendation:** Use `@spotify/web-api-ts-sdk` — it's the only option with browser-safe PKCE auth.

### Database Options

| Option | Why Not |
|--------|---------|
| **PostgreSQL (Supabase/Neon)** | Overkill for single user, adds network latency, costs money at scale |
| **IndexedDB** | Browser-only (can't server-render taste profiles), complex API, no SQL |
| **LocalStorage** | 5-10MB limit (too small for session history), no structured queries |
| **Turso (SQLite cloud)** | Adds latency, requires network, free tier is limited |

**Recommendation:** better-sqlite3 for local development + Vercel Blob for cloud persistence.

### State Management

| Option | Why Not |
|--------|---------|
| **Redux Toolkit** | Boilerplate overhead, overkill for single-user app, slower dev velocity |
| **Jotai/Recoil** | Atomic state is complex for playback (need derived state), less mature |
| **React Context** | Re-renders entire tree, no built-in polling, manual cache management |

**Recommendation:** Zustand for client state + SWR for Spotify polling.

### Animation Libraries

| Option | Why Not |
|--------|---------|
| **Motion One** | No gesture tracking (spec requires drag/swipe), smaller community |
| **React Spring** | Imperative API (hooks are awkward), harder to learn, no layout animations |
| **GSAP** | Paid license for commercial, not React-optimized, imperative API |
| **CSS-only** | No spring physics (spec requirement), limited gesture support |

**Recommendation:** Framer Motion — only option meeting spec's spring physics + gesture tracking requirements.

### Linting/Formatting

| Option | Why Not |
|--------|---------|
| **ESLint + Prettier** | Slow (Node.js-based), config sprawl, occasional conflicts between tools |
| **Rome** | Project abandoned (became Biome), no longer maintained |
| **Standard** | Opinionated (no semicolons), limited customization |

**Recommendation:** Biome — single tool, instant, built-in TypeScript support.

## Integration Notes

### Authentication Flow

```typescript
// Client-side OAuth PKCE flow (no server secrets)
import { SpotifyApi } from '@spotify/web-api-ts-sdk';

const sdk = SpotifyApi.withUserAuthorization(
  process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
  'http://localhost:3000/callback',
  ['user-read-playback-state', 'user-modify-playback-state', 'playlist-modify-private']
);

// SDK handles PKCE challenge/verifier + token refresh
```

**Why this works:**
- PKCE = no client secret in browser (safe)
- SDK auto-refreshes tokens before expiry
- Next.js middleware protects routes requiring auth

### Real-Time Playback State

```typescript
// Poll Spotify player state every 3 seconds
import useSWR from 'swr';

const { data: playbackState } = useSWR(
  'playback-state',
  () => sdk.player.getPlaybackState(),
  { refreshInterval: 3000 }
);
```

**Why this works:**
- SWR dedupes requests (multiple components can subscribe)
- Automatic cache invalidation
- Loading/error states built-in

### Voice DJ Pre-Generation

```typescript
// Generate next intro during current track
const currentTrack = playbackState.item;
const timeRemaining = currentTrack.duration_ms - playbackState.progress_ms;

if (timeRemaining < 30000 && !nextIntroGenerated) {
  // Generate intro for next track in queue
  const nextTrack = queue[0];
  const audio = await elevenlabs.generate({
    text: `Coming up next, ${nextTrack.name} by ${nextTrack.artists[0].name}`,
    voice: 'DJ_VOICE_ID'
  });

  // Pre-load into Howler
  preloadedIntro = new Howl({ src: [audio.url] });
}
```

**Why this works:**
- Hides ElevenLabs 1-3s latency
- Howler pre-loads audio buffer
- Triggers at 30s remaining (safe margin)

### Taste Profile Persistence

```typescript
// Drizzle ORM schema
export const tasteProfiles = sqliteTable('taste_profiles', {
  id: integer('id').primaryKey(),
  userId: text('user_id').notNull(),
  preferredGenres: text('preferred_genres', { mode: 'json' }).$type<string[]>(),
  bannedArtists: text('banned_artists', { mode: 'json' }).$type<string[]>(),
  energyPreference: real('energy_preference'), // 0-1
  updatedAt: integer('updated_at', { mode: 'timestamp' })
});

// Type-safe queries
const profile = db.select().from(tasteProfiles).where(eq(tasteProfiles.userId, userId)).get();
```

**Why this works:**
- Drizzle infers TypeScript types from schema
- JSON columns for arrays (SQLite-friendly)
- Synchronous API (better-sqlite3) = simpler error handling

### Claude Vibe Interpretation

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const message = await client.messages.create({
  model: 'claude-sonnet-4-5', // Fast for real-time
  max_tokens: 1024,
  messages: [{
    role: 'user',
    content: `User said: "${vibeDescription}". Convert to Spotify seed parameters.`
  }],
  response_format: { type: 'json_schema', schema: spotifyParamsSchema }
});

// Guaranteed JSON structure
const params = JSON.parse(message.content[0].text);
```

**Why this works:**
- Structured outputs guarantee valid JSON
- Sonnet 4.5 = ~2s response time (acceptable)
- Upgrade to Opus for complex curation refinement

### Deployment Patterns

**Vercel (recommended for v1):**
```bash
# Automatic on git push
vercel deploy --prod

# Environment variables
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=...
ELEVENLABS_API_KEY=...
```

**Self-hosted (zero cost option):**
```dockerfile
# Dockerfile
FROM node:20-alpine
RUN apk add --no-cache python3 make g++ # For better-sqlite3
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
services:
  vibe-dj:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data # SQLite persistence
    environment:
      - NODE_ENV=production

  caddy:
    image: caddy:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
```

## Installation

```bash
# Package manager
npm install -g pnpm

# Core dependencies
pnpm add next@latest react@latest react-dom@latest
pnpm add @spotify/web-api-ts-sdk
pnpm add @anthropic-ai/sdk
pnpm add elevenlabs
pnpm add better-sqlite3 drizzle-orm
pnpm add zustand swr
pnpm add framer-motion
pnpm add howler

# Dev dependencies
pnpm add -D typescript @types/node @types/react @types/better-sqlite3
pnpm add -D tailwindcss postcss autoprefixer
pnpm add -D @biomejs/biome
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D drizzle-kit # Schema management
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Spotify API rate limits | LOW | MEDIUM | Personal use = 180 req/min is generous, add exponential backoff |
| ElevenLabs latency spikes | MEDIUM | HIGH | Pre-generate 30s early, cache generated intros, fallback to silent transition |
| SQLite file corruption (Vercel) | HIGH | HIGH | Use Vercel Blob OR self-host, implement backup exports |
| OAuth token expiry | LOW | MEDIUM | SDK auto-refreshes, add manual refresh button as fallback |
| Album art CORS issues | MEDIUM | LOW | Spotify CDN allows CORS, fallback to gradient if blocked |

## Confidence Assessment

| Area | Confidence | Notes |
|------|-----------|-------|
| **Core Framework** | MEDIUM | Next.js 15 was RC in Jan 2025, likely stable now but unverified |
| **Spotify Integration** | HIGH | Official SDK, well-documented, PKCE flow is standard |
| **Claude API** | HIGH | v0.80.0 verified (March 2026), stable API |
| **ElevenLabs** | MEDIUM | SDK exists but version unverified |
| **Database** | HIGH | better-sqlite3 is mature, Drizzle is production-ready |
| **Animation** | HIGH | Framer Motion is stable, widely used |
| **Deployment** | HIGH | Next.js + Vercel is well-trodden path |

## Next Steps

1. **Verify versions:** Check npm for latest stable releases of all packages (web tools were unavailable during research)
2. **Test Spotify PKCE:** Validate OAuth flow in development before building UI
3. **Benchmark ElevenLabs:** Measure actual latency for 30s pre-generation window
4. **Decide persistence:** Vercel Blob vs self-hosted based on importance of taste profiles

## Sources

**Verified:**
- Anthropic TypeScript SDK v0.80.0 — https://github.com/anthropics/anthropic-sdk-typescript (WebFetch, March 18 2026)

**Unverified (January 2025 knowledge base):**
- All other package versions and recommendations
- Next.js 15 stability status
- Spotify SDK current version
- ElevenLabs SDK current version

**Note:** Web search and fetch tools were unavailable during research. All recommendations except Anthropic SDK version are based on January 2025 knowledge and should be verified against current official documentation before implementation.
