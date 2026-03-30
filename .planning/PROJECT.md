# Vibe DJ

## What This Is

Vibe DJ is a personal AI music curator that translates natural language mood descriptions into curated Spotify playback across Sonos speakers, with an optional AI voice DJ personality powered by ElevenLabs. It's a responsive web application (mobile-first, desktop-optimized) that serves as both a conversational interface and a live "now playing" dashboard with playlist management capabilities.

## Core Value

When a user describes a musical vibe in plain language, they hear it immediately through their Sonos speakers — and the curation is tight enough that the third track locks in the vibe with no manual skips needed.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Vibe interpretation — parse natural language mood/energy/genre descriptions into musical attributes and Spotify API parameters
- [ ] Session memory — maintain conversation context within a session
- [ ] Refinement loop — accept real-time feedback ("too mellow," "more like that one") and adjust queue
- [ ] Now Playing UI — album art, track info, playback controls synced to Spotify state
- [ ] Like/save functionality — add tracks to Liked Songs or playlists
- [ ] Queue display — live upcoming tracks with remove/reorder capability
- [ ] Spotify Connect playback — route to Sonos via Spotify Connect
- [ ] Chat interface — conversational input for vibe descriptions
- [ ] Session playlist — auto-generate playlist of session tracks
- [ ] Play history — scrollable history of played tracks
- [ ] Dynamic accent colors — extract from album art
- [ ] Voice DJ — ElevenLabs-powered track intros and commentary
- [ ] Taste profile — persistent user preferences across sessions
- [ ] Discovery engine — surface lesser-known artists matching the vibe
- [ ] Anti-drift logic — prevent recommendations from sliding to unwanted genres
- [ ] Branch from track — rebuild queue seeded from any track

### Out of Scope

- Native mobile app — web-first, mobile later
- Apple Music support — Spotify-only for v1
- Multi-user mode — single-user for v1
- Wake word activation — voice input via button, not ambient listening
- Sonos audio clip injection — requires newer hardware, defer to v2
- Real-time WebSocket updates — polling is sufficient for v1
- Authenticity filter (ghost artist detection) — nice-to-have, defer

## Context

**Technical Environment:**
- Next.js 14+ with App Router, React, TypeScript
- Tailwind CSS for styling, Framer Motion for animations
- SQLite for local persistence (taste profiles, session history)
- Spotify Web API (OAuth 2.0 PKCE, Recommendations, Search, Player)
- Claude API (Sonnet for speed, Opus for complex curation)
- ElevenLabs API for voice synthesis
- Vercel deployment (primary) or Mac Mini self-hosted (zero cost option)

**Design Direction:**
- Dark synthwave aesthetic — deep purples, magentas, cyans against warm dark backgrounds
- Typography: Editorial serif for display (Instrument Serif), humanist sans for UI (Satoshi)
- Anti-patterns: No Bootstrap conventions, no component-library defaults, no gray-on-gray
- Animation-heavy: spring physics, gesture tracking, crossfades everywhere
- Album art as hero — interface is a frame that disappears when not interacting

**User Profile:**
- Primary user: Dylan DiBona (personal tool)
- Music taste: Jazz-focused, specifically hard bop and live club energy
- Pain point: Spotify algorithms don't understand "cooking hard bop, no ballads, no smooth jazz"
- Environment: Sonos speakers in living room, phone on coffee table

**Prior Work:**
- Spec document defines detailed UI/UX requirements
- ElevenLabs account exists (need API key)
- Spotify Premium subscription active

## Constraints

- **API**: Must use Spotify Premium (Spotify Connect requires it)
- **Auth**: Spotify OAuth 2.0 PKCE flow (browser-based, no server secrets)
- **Rate Limits**: Spotify 180 req/min — generous for personal use
- **Voice Latency**: ElevenLabs adds 1-3s — must pre-generate during previous track
- **Polling**: Spotify has no webhooks — poll /me/player every 3-5 seconds
- **Dev Mode**: Spotify dev mode allows 25 users — sufficient for personal tool

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js 14+ with App Router | Modern React patterns, good DX, Vercel-native | — Pending |
| SQLite over external DB | Zero cost, local-first, sufficient for single user | — Pending |
| Spotify Connect over Sonos Cloud API | Simpler integration, works with all Sonos hardware | — Pending |
| Dark synthwave aesthetic | Fits late-night listening vibe, high personality | — Pending |
| Framer Motion over CSS animations | Spec requires spring physics and gesture tracking | — Pending |
| Claude structured JSON responses | Reliable parsing, consistent DJ behavior | — Pending |
| Polling over WebSocket | Spotify doesn't offer webhooks, polling is sufficient | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-30 after initialization*
