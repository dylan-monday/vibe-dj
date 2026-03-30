# Vibe DJ - Claude Code Guide

## What This Is

Vibe DJ is an AI music curator that translates natural language mood descriptions ("cooking hard bop, no ballads") into curated Spotify playback on Sonos speakers, with optional AI voice DJ commentary.

**Core Value:** User describes a vibe → hears it immediately on Sonos → third track locks in with no manual skips needed.

## Quick Commands

```bash
# Development
npm run dev          # Start dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npm run type-check   # TypeScript check

# Database
npx drizzle-kit push  # Apply schema changes
npx drizzle-kit studio # DB GUI at localhost:4983

# GSD Workflow
/gsd:progress         # Check current phase and next action
/gsd:plan-phase N     # Plan phase N
/gsd:execute-phase N  # Execute phase N plans
/gsd:verify-work N    # Validate phase N completion
```

## Project Structure

```
/app                  # Next.js App Router pages
  /api                # API routes (Spotify OAuth, Claude, ElevenLabs)
  /auth               # Auth callback handlers
  /page.tsx           # Main app (now playing + chat)

/components           # React components
  /ui                 # Base UI (buttons, inputs, cards)
  /player             # Now playing, controls, queue
  /chat               # Chat interface, messages
  /auth               # Login/device selection

/lib                  # Core logic
  /spotify            # Spotify API client, auth, polling
  /ai                 # Claude vibe interpretation
  /voice              # ElevenLabs synthesis
  /db                 # Drizzle ORM + SQLite
  /stores             # Zustand state stores

/data                 # SQLite database file (gitignored)

/.planning            # GSD workflow artifacts
  /PROJECT.md         # Master context
  /REQUIREMENTS.md    # v1 requirements
  /ROADMAP.md         # Phase breakdown
  /STATE.md           # Current position
  /research/          # Domain research
  /phase-N/           # Phase plans and artifacts
```

## Key Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| `@spotify/web-api-ts-sdk` | Only SDK with browser-safe PKCE OAuth |
| Polling over WebSocket | Spotify has no webhooks; poll every 3s |
| Playlist-based queue OR URI array | Spotify queue API is write-only (no read/remove) |
| Claude for intent parsing only | Never let LLM query Spotify directly (hallucinations) |
| Anticipatory voice generation | Pre-generate 30-60s early to hide ElevenLabs latency |
| SQLite + Drizzle | Zero-cost, synchronous, sufficient for single user |

## Critical Pitfalls

1. **Token Refresh Race Conditions** — Use singleton token manager with proactive refresh at 50min (before 60min expiry)

2. **Filter Bubble Collapse** — Spotify Recommendations converges on 3-4 artists. Rotate seeds aggressively, inject diversity.

3. **LLM Hallucinations** — Claude will confidently name tracks that don't exist. Use structured output for intent only, validate via Spotify Search.

4. **Queue API Limitations** — Spotify queue is POST-only. Manage queue as playlist or URI array, not via queue endpoint.

5. **Spotify Connect Desync** — Polling has inherent lag. Use optimistic UI with rollback on conflict.

## Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...       # Claude API
SPOTIFY_CLIENT_ID=...              # Spotify Developer Dashboard
SPOTIFY_CLIENT_SECRET=...          # Spotify Developer Dashboard
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# Optional
ELEVENLABS_API_KEY=sk_...          # Voice DJ feature
ELEVENLABS_VOICE_ID=...            # Selected voice

# Database
DATABASE_URL=file:./data/vibe-dj.db

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

## Tech Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5.4+
- **Styling:** Tailwind CSS, Framer Motion 11.x
- **State:** Zustand (client), SWR (server polling)
- **AI:** Anthropic SDK (@anthropic-ai/sdk)
- **Music:** Spotify Web API SDK (@spotify/web-api-ts-sdk)
- **Voice:** ElevenLabs SDK
- **Database:** SQLite (better-sqlite3) + Drizzle ORM
- **Deployment:** Vercel (dylan-monday/vibe-dj)

## Design Direction

**Aesthetic:** Dark synthwave — deep purples (#7c3aed), magentas (#ec4899), cyans (#06b6d4) against warm dark backgrounds (#18181b).

**Typography:**
- Display: Instrument Serif (editorial, expressive)
- UI: Satoshi (humanist sans, readable)

**Key Principles:**
- Album art as hero element (interface disappears when not interacting)
- Spring physics animations throughout (Framer Motion)
- Mobile-first (phone on coffee table is primary use case)
- No Bootstrap conventions, no component-library defaults

## Current Phase

See `.planning/STATE.md` for current position. Use `/gsd:progress` to check status and next action.

## Deployment

- **Production:** https://tunes.dylandibona.com
- **Vercel Project:** dylan-monday/vibe-dj
- **Git:** dylan-monday account

## API Rate Limits

- **Spotify:** 180 req/min (generous for personal use)
- **Claude:** Standard tier limits
- **ElevenLabs:** Character-based, monitor usage

## Testing Strategy

- Unit tests: Vitest for logic (vibe interpretation, recommendation)
- Integration: Playwright for auth flows, playback
- Manual: Vibe accuracy testing (subjective quality)
