---
phase: 1
plan: 1
subsystem: foundation
tags: [next.js, typescript, tailwind, spotify-sdk, project-setup]
dependency_graph:
  requires: []
  provides: [project-scaffold, dependencies, base-types, dark-theme]
  affects: [all-future-plans]
tech_stack:
  added: [next.js-16, react-19, typescript-5, tailwind-4, spotify-web-api-ts-sdk, zustand, swr, framer-motion]
  patterns: [app-router, singleton-client, pkce-auth-prep]
key_files:
  created:
    - package.json
    - tsconfig.json
    - next.config.ts
    - tailwind.config.ts
    - app/layout.tsx
    - app/page.tsx
    - app/globals.css
    - lib/spotify/types.ts
    - lib/spotify/client.ts
    - lib/spotify/index.ts
    - .env.example
  modified: []
decisions:
  - Used Next.js 16 instead of 15 (latest stable, better features)
  - Adapted to Tailwind CSS v4 with @theme syntax (bundled with Next.js 16)
  - Removed SPOTIFY_CLIENT_SECRET from .env.example (PKCE flow doesn't need it)
metrics:
  duration_minutes: 7
  completed_date: "2026-03-30T23:22:07Z"
  tasks_completed: 6
  commits: 6
  files_created: 11
  files_modified: 2
---

# Phase 01 Plan 01: Project Scaffold and Dependencies Summary

**One-liner:** Next.js 16 project with TypeScript, Tailwind v4 dark synthwave theme, Spotify SDK integration foundations, and base client architecture.

## What Was Built

Initialized complete Next.js 16 project scaffold with all Phase 1 dependencies and foundational Spotify integration structures:

1. **Next.js 16 App Router** - Modern React 19 with TypeScript 5, ESLint, and production build pipeline
2. **Tailwind CSS v4 Dark Synthwave Theme** - Custom color palette (purple primary #7c3aed, magenta/cyan accents, warm dark backgrounds) with display/sans fonts configured
3. **Phase 1 Dependencies** - Spotify Web API SDK (PKCE-ready), Zustand (state), SWR (polling), Framer Motion (animations)
4. **Spotify Client Architecture** - Type definitions (TokenState, SpotifyDevice, PlaybackState) and singleton client wrapper with 50-minute proactive refresh threshold
5. **Base App Shell** - "Vibe DJ" branded layout with dark mode, placeholder home page ready for authentication (Plan 02)
6. **Environment Configuration** - PKCE-optimized .env.example with NEXT_PUBLIC_SPOTIFY_CLIENT_ID for browser-safe auth

## Acceptance Criteria Status

All acceptance criteria met:

- [x] Next.js 16.2.1 running (upgraded from planned 15.x)
- [x] TypeScript 5.x with strict mode, compiles without errors
- [x] Tailwind CSS configured with dark synthwave palette
- [x] All Phase 1 dependencies installed (@spotify/web-api-ts-sdk, zustand, swr, framer-motion)
- [x] Base layout with "Vibe DJ" branding and dark theme
- [x] Spotify client types and singleton pattern stub created
- [x] Environment variables documented (PKCE flow, no client secret)
- [x] Production build succeeds

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Adapted to Next.js 16 and Tailwind CSS v4**
- **Found during:** Task 1
- **Issue:** create-next-app@latest installs Next.js 16 (not 15 as planned). Next.js 16 bundles Tailwind CSS v4 which uses CSS-first configuration (@theme syntax) instead of tailwind.config.ts with JS objects.
- **Fix:**
  - Accepted Next.js 16 (newer version, better features, no breaking changes for our use case)
  - Created tailwind.config.ts for compatibility but adapted app/globals.css to use Tailwind v4 @theme syntax
  - Updated color definitions to work with both config approaches
- **Files modified:** tailwind.config.ts (created), app/globals.css (updated to @theme syntax)
- **Commits:** be20aa1, 000bac0
- **Rationale:** Next.js 16 is the latest stable release with React 19 support. Tailwind v4 is the future and works better with Next.js 16's bundler. No functional impact on project goals.

**2. [Rule 2 - Missing Critical Functionality] Removed SPOTIFY_CLIENT_SECRET**
- **Found during:** Task 6
- **Issue:** Existing .env.example template included SPOTIFY_CLIENT_SECRET, but CLAUDE.md and plan specify PKCE flow which doesn't use client secrets (browser-safe authentication).
- **Fix:** Removed SPOTIFY_CLIENT_SECRET, added NEXT_PUBLIC_SPOTIFY_CLIENT_ID for browser exposure
- **Files modified:** .env.example
- **Commit:** 6e14239
- **Rationale:** PKCE (Proof Key for Code Exchange) is the correct OAuth flow for SPAs. Client secrets cannot be kept secret in browser environments, so Spotify's PKCE flow uses public client ID + dynamic code verifier instead.

## Known Stubs

None - all placeholder content is intentional:

- `app/page.tsx` has a pulsing placeholder div for the login button → Plan 02 will implement OAuth login button
- `lib/spotify/client.ts` has null client and stub functions → Plan 02 will initialize the client after OAuth callback

## Technical Notes

### Next.js 16 vs 15 Differences
- **React 19:** Concurrent rendering improvements, better Suspense support
- **Tailwind CSS 4:** CSS-first configuration via @theme blocks instead of JS config objects
- **Turbopack:** Default bundler (faster builds)
- **No breaking changes** for our use case (App Router, TypeScript, basic routing)

### Tailwind v4 @theme Syntax
```css
@theme {
  --color-background: #18181b;
  --color-primary: #7c3aed;
}
```
Replaces the old `tailwind.config.ts` color extension pattern. Both approaches work, but v4 is preferred for performance.

### Singleton Client Pattern
The `lib/spotify/client.ts` singleton prevents multiple SDK instances and centralizes token refresh logic. Future plans will:
- Plan 02: Initialize client after OAuth callback
- Plan 02+: Implement proactive token refresh using `shouldRefreshToken()` threshold

## Files Changed

### Created (11 files)
- `package.json` - Project dependencies and scripts
- `tsconfig.json` - TypeScript strict mode configuration
- `next.config.ts` - Next.js App Router config
- `tailwind.config.ts` - Tailwind color palette (compatibility layer)
- `app/layout.tsx` - Root layout with dark mode and Vibe DJ metadata
- `app/page.tsx` - Placeholder home page with login stub
- `app/globals.css` - Tailwind v4 @theme dark synthwave styles
- `lib/spotify/types.ts` - Spotify type definitions
- `lib/spotify/client.ts` - Singleton client wrapper
- `lib/spotify/index.ts` - Barrel export
- `.env.example` - PKCE-optimized environment template

### Modified (2 files)
- `.env.example` - Removed client secret, added public client ID
- `tailwind.config.ts` - Extended with synthwave palette

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| be20aa1 | chore | Initialize Next.js 16 with App Router |
| e1948ae | chore | Install Phase 1 dependencies |
| 000bac0 | feat | Configure Tailwind dark synthwave theme |
| a73f0c1 | feat | Create base Spotify client types and stub |
| 38a4c39 | feat | Create base app layout and shell |
| 6e14239 | chore | Update environment variables template |

## Next Steps

**Plan 02 (Spotify OAuth PKCE Authentication)** can now:
- Initialize SpotifyApi client using NEXT_PUBLIC_SPOTIFY_CLIENT_ID
- Implement PKCE authorization flow with redirect to `/api/auth/callback/spotify`
- Store tokens in Zustand store using TokenState interface
- Replace placeholder login button in app/page.tsx with real OAuth trigger

**Dependencies ready:**
- `@spotify/web-api-ts-sdk` for PKCE auth
- `zustand` for token state management
- Type safety via `lib/spotify/types.ts`

## Verification

```bash
# Dependencies installed
npm ls @spotify/web-api-ts-sdk zustand swr framer-motion
# ✓ All present

# TypeScript compiles
npx tsc --noEmit
# ✓ No errors

# Production build
npm run build
# ✓ Success (Route: /)
```

## Self-Check: PASSED

All created files verified:
- [x] package.json exists
- [x] app/layout.tsx exists
- [x] app/page.tsx exists
- [x] lib/spotify/types.ts exists
- [x] lib/spotify/client.ts exists
- [x] lib/spotify/index.ts exists
- [x] tailwind.config.ts exists
- [x] .env.example exists

All commits verified:
- [x] be20aa1 exists
- [x] e1948ae exists
- [x] 000bac0 exists
- [x] a73f0c1 exists
- [x] 38a4c39 exists
- [x] 6e14239 exists
