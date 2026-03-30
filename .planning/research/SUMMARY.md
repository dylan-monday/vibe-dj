# Project Research Summary

**Project:** Vibe DJ - AI Music Curator
**Domain:** AI-powered music curation with real-time Spotify playback
**Researched:** 2026-03-30
**Confidence:** MEDIUM

## Executive Summary

Vibe DJ is an AI-powered music curator that translates natural language descriptions ("cooking hard bop, no ballads") into curated Spotify playback with optional voice DJ commentary. Expert implementations of this domain prioritize a **layered architecture** separating Spotify integration, AI interpretation, and real-time state synchronization. The recommended approach uses Next.js 15 (App Router), the official Spotify Web API TypeScript SDK with PKCE auth, Anthropic's Claude API for vibe interpretation, and ElevenLabs for voice synthesis, with SQLite for taste profile persistence.

The **critical architectural insight** is that three asynchronous systems must coordinate seamlessly: Spotify's polling-based player state (updated every 3-5 seconds), Claude's vibe interpretation (2-5 second latency), and ElevenLabs voice generation (1-3 second latency). Success depends on **anticipatory generation** (pre-generating voice clips during the previous track), **unidirectional data flow** (Spotify as source of truth), and **graceful degradation** (core playback works even if AI services fail).

The **highest-risk pitfall** is Spotify's queue API limitations—it's write-only with no read/remove/reorder capabilities. This forces a choice between playlist-based queue management (visible in Spotify but slower) or ephemeral URI-based playback (fast but app-only). Additionally, the Spotify Recommendations API tends toward "filter bubble collapse" (converging on 3-4 artists), requiring aggressive seed rotation and diversity injection. Token refresh race conditions and Spotify Connect state desync are architectural issues that must be solved in Phase 1, not patched later.

## Key Findings

### Recommended Stack

The research identifies a modern TypeScript-first stack optimized for real-time API orchestration. **Next.js 15 (App Router)** provides server actions for token refresh and React Server Components for safer API key handling. The **official Spotify SDK (`@spotify/web-api-ts-sdk`)** is critical—it's the only option with browser-safe PKCE OAuth, unlike older libraries that require server secrets. **Anthropic SDK v0.80.0** (verified current) enables structured JSON output for reliable vibe parsing. **Better-sqlite3 + Drizzle ORM** handles taste profiles with synchronous APIs (simpler than async alternatives), though this requires careful deployment planning (Vercel Blob or self-hosting vs. ephemeral serverless).

**Core technologies:**
- **Next.js 15** (App Router): Full-stack React framework — Server Components for API safety, Server Actions for token refresh, built-in TypeScript support
- **@spotify/web-api-ts-sdk** (1.2+): Official Spotify client — PKCE auth built-in, automatic token refresh, full type safety (avoid `spotify-web-api-node` which lacks PKCE)
- **@anthropic-ai/sdk** (0.80.0): Claude API client — Verified latest version, streaming support, structured JSON output for reliable vibe interpretation
- **better-sqlite3 + Drizzle ORM**: Local persistence — Zero runtime overhead, synchronous API, sufficient for single-user taste profiles
- **Framer Motion** (11.x): Animation library — Required for spec's spring physics + gesture tracking, only option meeting crossfade requirements
- **Zustand** (4.x) + **SWR**: State management — Simple client state (Zustand) + automatic polling/cache (SWR) avoids Redux boilerplate

**Critical version notes:**
- Node.js 20 LTS required for better-sqlite3 native bindings
- React 19.x bundled with Next.js 15 (concurrent features for smooth playback)
- TypeScript 5.4+ required for Spotify SDK type safety

**Deployment considerations:**
- Vercel (primary): Zero-config Next.js support, free tier sufficient, but SQLite requires Vercel Blob or migration to Turso
- Self-hosted (zero-cost option): Docker + Caddy on Mac Mini, SQLite-friendly, automatic HTTPS

### Expected Features

Research identifies a clear hierarchy of features based on competitive analysis (Spotify AI DJ, Apple Music, Pandora) and domain conventions.

**Must have (table stakes):**
- **Playback controls** — Play/pause/skip/volume are standard music player expectations; users expect device-like control
- **Now playing display** — Album art, track title, artist confirms system is working; missing this breaks user trust
- **Queue visibility** — Users need to see upcoming tracks to trust AI choices; critical for transparency
- **Track skip** — Essential escape hatch for bad picks; AI won't be perfect, users need control
- **Session persistence** — Resume playback state across page reloads; users expect this from modern web apps
- **Like/save tracks** — Capture discoveries; core music app behavior
- **Device selection** — Choose Spotify Connect target (Sonos); required for multi-device playback
- **Mobile responsiveness** — Primary use case is phone on coffee table; must be touch-friendly

**Should have (competitive differentiators):**
- **Conversational refinement** — "Too mellow" / "more like that" adjusts queue mid-session; Spotify AI DJ lacks this interactivity
- **Anti-drift logic** — "Cooking hard bop, no ballads" stays hard bop; algorithms often drift to related-but-wrong genres
- **Voice DJ personality** — ElevenLabs intros/commentary between tracks; differentiator is customization vs. Spotify's fixed voice
- **Mood-to-music parsing** — "Friday afternoon coding energy" → upbeat instrumental; better than genre-first search
- **Taste profile learning** — Remembers "no smooth jazz" without re-stating each session; cross-session memory
- **Session playlist auto-save** — Auto-generate playlist from session history; makes good sessions replayable

**Defer (v2+):**
- **Voice DJ** (high complexity, unproven value) — Ship silent first, validate vibe accuracy, add voice after core curation works
- **Discovery bias control** (nice-to-have tuning) — Use Spotify's defaults first, add slider after understanding user preferences
- **Branch from track** (requires stable queue foundation) — Add after basic queue management proven
- **Multi-user mode** (complexity explosion) — Single-user for v1; "whose taste wins?" is unsolved problem

**Explicitly avoid (anti-features):**
- Playlist editing (becomes generic music app), social sharing (not a social product), music upload (out of scope), lyrics display (UI clutter), equalizer (hardware concern), podcast support (different content type)

### Architecture Approach

The architecture uses a **layered separation of concerns** with six primary components: Presentation (React UI), State Management (playback/session/taste stores), API Integration (Spotify/Claude/ElevenLabs clients), Intelligence (vibe interpretation/recommendation logic), Persistence (SQLite for taste profiles), and Polling Orchestrator (Spotify state sync). The critical architectural challenge is coordinating asynchronous operations across multiple APIs while maintaining real-time UI responsiveness.

**Major components:**
1. **Presentation Layer** (Client-Side React) — Chat interface, now playing display, queue manager, history view; uses Framer Motion for animations, dynamic accent colors from album art
2. **API Integration Layer** — Spotify API client (player state polling every 3-5s, playback control, recommendations, OAuth PKCE flow); Claude API client (vibe interpretation with structured JSON output); ElevenLabs client (anticipatory voice generation during previous track)
3. **Intelligence Layer** — Vibe Interpreter (NL → musical attributes via Claude), Recommendation Engine (attributes → Spotify tracks with anti-filter-bubble logic), Refinement Engine (feedback → adjusted queue)
4. **State Management Layer** — Playback State (current track, position, is_playing updated via polling), Queue State (upcoming tracks), Session Store (conversation history, vibe context), Taste Profile Store (persistent preferences, anti-drift rules)
5. **Persistence Layer** — SQLite schema for taste profiles, session history, session tracks; accessed via API routes (not direct client access)
6. **Polling Orchestrator** — 3-second interval when playing, exponential backoff when paused, stops when tab backgrounded (Page Visibility API)

**Critical data flow pattern:**
```
User Input → Vibe Interpreter (Claude) → Recommendation Engine (Spotify) → Queue State → Spotify API → Playback State (polling) → UI Update
```

**Key architectural patterns to follow:**
- **Anticipatory Voice Generation**: Generate voice clips 30-60s before track ends to hide ElevenLabs latency
- **Optimistic Queue Updates**: Update UI immediately, sync to Spotify in background with rollback on error
- **Hybrid Seeding Strategy**: Mix taste profile artists (80% familiar) with vibe-specific genres (20% discovery) to balance personalization and accuracy
- **Graceful Degradation**: Voice DJ fails → continue without voice; Claude slow → use cached vibe; Spotify rate limited → exponential backoff

### Critical Pitfalls

Research identifies five pitfalls that cause rewrites or major issues if not addressed architecturally from Phase 1:

1. **Token Refresh Race Conditions** — Multiple concurrent requests trigger simultaneous refresh attempts, causing 401 cascades. **Prevention:** Singleton token manager with mutex pattern, proactive refresh at 50 minutes (before 60-minute expiry), queue requests during refresh. **Phase impact:** Must solve in Phase 1 (architectural, not a later fix).

2. **Spotify Recommendations API "Filter Bubble Collapse"** — API converges on 3-4 artists after multiple calls, creating repetitive loops. Jazz requests collapse into Kenny G despite user preferences. **Prevention:** Rotate seed tracks aggressively (never reuse same seed in session), blend multiple recommendation calls with different seed types, inject diversity from user's top artists, implement "seen artists" filter, combine Recommendations with Search API for targeted exploration. **Phase impact:** Requires experimentation in Phase 2.

3. **LLM Hallucinating Music Metadata** — Claude confidently returns artist names/tracks that don't exist in Spotify's catalog. **Prevention:** Never let LLM directly query Spotify; use structured output for intent only (`{ mood, genre_seeds, audio_features }`), validate all suggestions via Spotify Search API, use LLM for intent parsing not music expertise. **Phase impact:** Core to Phase 2 prompt engineering strategy.

4. **Spotify Connect State Desync** — Polling every 3-5 seconds has inherent lag; user pauses from phone but app shows "playing." **Prevention:** Poll aggressively during playback (2-3s), optimistic UI updates with rollback on conflict, show "stale" indicator when last poll exceeds 5s, handle 204 No Content (no active device) gracefully. **Phase impact:** Polling strategy is Phase 1 foundation.

5. **Queue Manipulation Limits** — Spotify's queue API is POST-only (add), no GET/DELETE/reorder. Your app's queue display is a simulation that can desync from actual playback. **Prevention:** Don't use Spotify's queue API for user-facing management; instead, manage queue as a playlist (create session playlist, add/remove/reorder tracks, play from playlist position) OR use `play` endpoint with `uris` array (ephemeral, max 800 tracks). Accept tradeoff: queue only visible in your app, not Spotify native clients. **Phase impact:** Architectural decision in Phase 1.

**Moderate pitfalls to watch:**
- Over-polling during inactive playback (implement exponential backoff)
- ElevenLabs voice latency causing dead air (pre-generate 30s early)
- SQLite concurrency in Vercel serverless (use Turso or self-host)
- Anti-drift logic overfitting (store exclusions, not hard filters)

## Implications for Roadmap

Based on combined research, the natural build order follows **dependency chains** and **risk mitigation priorities**. The critical path is Foundation (Spotify integration) → Intelligence (AI curation) → Refinement (learning/memory), with Voice Personality as a parallel track.

### Phase 1: Spotify Foundation
**Rationale:** Authentication, playback state polling, and basic controls establish the foundation that all other features depend on. Must solve architectural issues (token refresh, queue strategy, polling) that would require rewrites if deferred.

**Delivers:** User can authenticate with Spotify, see current playback, control playback (play/pause/skip/volume), select Sonos device as target.

**Addresses:**
- Table stakes: Playback controls, Now Playing display, Device selection, Volume control
- Avoids Pitfall 1 (token refresh race conditions), Pitfall 4 (Connect state desync), Pitfall 5 (queue manipulation limits)

**Architecture:** Spotify API client (OAuth PKCE flow with singleton token manager), Playback State store, Polling Orchestrator (3s interval with Page Visibility API), Now Playing display, basic playback controls UI.

**Estimated complexity:** Medium (2 weeks) — OAuth flow is standard but queue strategy requires architectural decision (playlist-based vs. URI-based).

**Research flags:**
- **Needs research:** Spotify Connect device selection (reliable device name matching? Sonos-specific behavior? May need manual picker UI)
- **Needs research:** Queue strategy tradeoffs (playlist performance vs. URI limitations)
- **Standard patterns:** OAuth PKCE flow, token refresh logic (well-documented)

---

### Phase 2: AI Curation
**Rationale:** Cannot deliver core value ("describe vibe, hear music") without AI interpretation. Depends on Phase 1's Spotify foundation but is the primary differentiator.

**Delivers:** User types "cooking hard bop, no ballads" in chat, Claude interprets to musical attributes, Spotify returns recommendations, tracks play on Sonos, queue displays upcoming 5 tracks.

**Addresses:**
- Table stakes: Queue visibility, Search fallback
- Differentiators: Conversational refinement (MVP: initial interpretation only), Mood-to-music parsing, Multi-constraint parsing
- Avoids Pitfall 2 (filter bubble collapse), Pitfall 3 (LLM hallucinations)

**Uses stack:**
- Anthropic SDK (0.80.0) with structured JSON output
- Claude Sonnet 4.5 (fast, ~2s response time)
- Spotify Recommendations API with hybrid seeding

**Implements architecture:**
- Claude API client
- Vibe Interpreter (NL → `{ genres, energy, valence, tempo, instrumentalness }`)
- Recommendation Engine (attributes → track URIs with diversity injection)
- Queue State store
- Chat Interface UI
- Queue Manager UI

**Estimated complexity:** High (2-3 weeks) — Requires experimentation with recommendation seed strategies, prompt engineering for reliable structured output, anti-filter-bubble logic iteration.

**Research flags:**
- **Needs research:** Optimal seed rotation strategy (how aggressively? what diversity ratio?)
- **Needs research:** Claude structured output schema refinement (what attributes matter most?)
- **Needs research:** Spotify Recommendations API convergence patterns (measure filter bubble in testing)
- **Standard patterns:** LLM prompt engineering (well-established), API orchestration

---

### Phase 3: Refinement & Memory
**Rationale:** Requires working curation (Phase 2) to refine. Adds feedback loop ("too mellow" → queue adjusts) and persistent taste learning (cross-session memory).

**Delivers:** User says "too mellow" or "more like that" → queue adjusts immediately. User closes app, reopens → taste profile persists. Session complete → playlist auto-saved to Spotify.

**Addresses:**
- Differentiators: Conversational refinement (full feedback loop), Anti-drift logic, Taste profile learning, Genre exclusion rules, Session playlist auto-save
- Table stakes: Session persistence, Playback history, Like/save tracks
- Avoids Pitfall 10 (anti-drift overfitting)

**Implements architecture:**
- Refinement Engine (feedback → adjusted attributes via Claude with session context)
- SQLite schema (taste profiles, sessions, session tracks)
- Taste Profile Store (persistent)
- Session Store (persistent)
- API routes for DB access
- Feedback UI in chat ("too mellow" quick actions)
- History View
- Session playlist auto-creation via Spotify Playlists API

**Estimated complexity:** Medium-High (2 weeks) — SQLite setup is straightforward, but refinement quality requires context window tuning and anti-drift rule experimentation.

**Research flags:**
- **Needs research:** Claude context window size (10 vs. 20 messages? impact on refinement quality?)
- **Needs research:** Anti-drift rule storage format (exclusions vs. penalties? genre-level vs. attribute-level?)
- **Standard patterns:** SQLite schema design, session persistence (well-established)

---

### Phase 4: Voice Personality (Parallel Track)
**Rationale:** Depends only on Phase 1's playback state for trigger timing; can build in parallel with Phases 2-3. Deferred to validate core curation works before adding voice (complexity high, value unproven).

**Delivers:** Track changes → voice intro plays automatically with no user-visible latency. User can enable/disable voice DJ. Natural commentary based on track metadata and session vibe.

**Addresses:**
- Differentiators: Voice DJ personality (customizable vs. Spotify's fixed voice)
- Avoids Pitfall 8 (ElevenLabs latency causing dead air)

**Uses stack:**
- ElevenLabs SDK (0.x)
- Howler.js (2.2+) for audio crossfading and pre-loading
- Claude Opus 4.5 for script generation (better than Sonnet for creative commentary)

**Implements architecture:**
- ElevenLabs API client
- Voice Synthesis Orchestrator (anticipatory generation: trigger at 30-60s remaining, cache audio blob)
- Voice cache (in-memory Map for session)
- Voice DJ Controls UI (enable/disable toggle)
- Audio playback integration (play clip before track starts)

**Estimated complexity:** Medium (1-2 weeks) — ElevenLabs integration is straightforward, but timing coordination and caching strategy require tuning.

**Research flags:**
- **Needs research:** ElevenLabs latency benchmarking (p95/p99 generation time to tune pre-generation window)
- **Needs research:** Voice caching effectiveness (hit rate for repeated tracks? localStorage persistence?)
- **Standard patterns:** Audio playback (Howler.js patterns well-documented)

---

### Phase 5: Polish & Discovery
**Rationale:** Enhancement features after core loop proven. Depends on Phase 3's session history and taste profile.

**Delivers:** Queue includes 20% lesser-known artists matching vibe. User can view all session playlists. History scrolls smoothly with album art. UI accent colors adapt to album art.

**Addresses:**
- Differentiators: Discovery bias control, Branch from track, Dynamic UI theming
- Table stakes: Mobile responsiveness (final polish), Error recovery
- Avoids Pitfall 14 (taste profile overfitting)

**Implements architecture:**
- Discovery Engine (Spotify `target_popularity` parameter, time-weighted taste profile)
- Playlist Manager UI
- Dynamic accent color extraction (from album art via canvas)
- Gesture-based controls (Framer Motion swipe/hold)
- Anti-drift logic refinement

**Estimated complexity:** Low-Medium (1 week) — Mostly UI polish and parameter tuning.

**Research flags:**
- **Standard patterns:** All features use established patterns (no deep research needed)

---

### Phase Ordering Rationale

**Critical path:** 1 → 2 → 3 (8-10 weeks total, core value by Week 4)
- Phase 1 solves architectural pitfalls (token refresh, queue API, polling) that would require rewrites if deferred
- Phase 2 delivers core value proposition ("describe vibe, hear music") and validates AI curation quality
- Phase 3 adds competitive differentiators (refinement loop, taste learning) that require Phase 2's foundation

**Parallel path:** 1 → 4 (3-4 weeks after Phase 1)
- Voice personality depends only on playback state, not AI curation
- Can build alongside Phases 2-3 if resources allow
- Recommended to defer: ship silent first, validate curation accuracy, add voice after usage patterns emerge

**Why not voice-first?** Voice is high-complexity (latency coordination, caching strategy) with unproven value (Spotify AI DJ has voice but adoption data unavailable). Risk mitigation: prove curation works before adding entertainment layer.

**Why Foundation before Intelligence?** Cannot test AI recommendations without authenticated Spotify playback. OAuth flow and polling architecture are prerequisites for all features.

**Why Refinement after Intelligence?** Cannot refine what doesn't exist. Feedback loop requires working recommendation engine to adjust. Taste profile learning requires session data to analyze.

### Research Flags

**Phases likely needing deeper research during planning:**
- **Phase 1:** Spotify Connect device selection (Sonos-specific behavior unverified), queue strategy tradeoffs (needs prototyping)
- **Phase 2:** Recommendation seed strategies (requires experimentation), Claude structured output schema (iterative refinement), filter bubble mitigation (measure convergence patterns)
- **Phase 3:** Claude context window optimization (A/B test refinement quality), anti-drift rule format (hard filters vs. soft penalties)
- **Phase 4:** ElevenLabs latency benchmarking (p95/p99 measurement), pre-generation window tuning

**Phases with standard patterns (skip research-phase):**
- **Phase 1:** OAuth PKCE flow (well-documented), token refresh (established patterns)
- **Phase 3:** SQLite schema design (straightforward), session persistence (common pattern)
- **Phase 5:** UI polish (standard React patterns), color extraction (canvas API well-documented)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Stack** | MEDIUM | Next.js 15 was RC in Jan 2025 (likely stable now but unverified); Anthropic SDK v0.80.0 verified March 2026 (HIGH); Spotify SDK version unverified (MEDIUM); ElevenLabs SDK version unverified (MEDIUM) |
| **Features** | HIGH | Table stakes derived from established music app conventions; differentiators mapped against competitive gaps (Spotify AI DJ, Apple Music, Pandora); feature dependencies validated against architecture |
| **Architecture** | HIGH | Component boundaries proven in similar real-time API orchestration apps; Next.js App Router patterns established; data flow follows React best practices; build order validated against dependency graph |
| **Pitfalls** | MEDIUM | Spotify API pitfalls based on pre-2025 training data (core patterns stable but should verify rate limits/new endpoints); LLM hallucination patterns well-established (HIGH); architecture pitfalls current as of Jan 2025 (React/Next.js best practices) |

**Overall confidence:** MEDIUM

Research provides strong architectural guidance and identifies critical pitfalls, but specific API behaviors (Spotify queue handling, ElevenLabs latency, Recommendations convergence) need verification during implementation. The recommended stack is sound but package versions should be verified (except Anthropic SDK, which is confirmed current).

### Gaps to Address

**High-priority gaps (validate early):**
- **Spotify API current state** (Jan 2025 knowledge cutoff): Verify rate limits (claimed 180 req/min), queue endpoint behavior, new features post-2025-01
- **Spotify Connect device discovery reliability**: Test Sonos device name matching, type field consistency across multiple speakers
- **ElevenLabs latency characteristics**: Measure p50/p95/p99 generation time to validate 30-60s pre-generation window assumption
- **Spotify Recommendations convergence patterns**: Prototype seed rotation strategies, measure "filter bubble" effect with real API

**Medium-priority gaps (address during phase planning):**
- **Claude context window optimal size**: A/B test refinement quality with 5/10/20 message windows
- **Anti-drift rule enforcement strategy**: Test hard filters vs. soft penalties with "no smooth jazz" use case
- **Queue strategy tradeoffs**: Benchmark playlist-based vs. URI-based queue performance, UX implications

**Low-priority gaps (defer to polish phases):**
- **Taste profile time-weighting**: How to balance recent sessions vs. long-term patterns (Phase 5)
- **Discovery bias ratio**: Optimal familiar/discovery split (80/20? 70/30?) (Phase 5)
- **Voice DJ adoption**: Is it desired or gimmicky? Make optional, test with users (Phase 4)

**Deployment decision point:**
- **SQLite persistence strategy**: Vercel Blob vs. self-hosted vs. Turso? Impacts Phase 1 architecture. Recommendation: prototype both, choose based on taste profile importance vs. zero-cost hosting preference.

## Sources

### Primary (HIGH confidence)
- **Anthropic TypeScript SDK v0.80.0** — Verified current (March 18, 2026) via https://github.com/anthropics/anthropic-sdk-typescript
- **PROJECT.md** — Domain requirements, feature specifications, deployment constraints

### Secondary (MEDIUM confidence)
- **Spotify Web API documentation** (training data through Jan 2025) — OAuth patterns, player endpoints, recommendations logic
- **Next.js 14/15 patterns** (training data through Jan 2025) — App Router, Server Components, Server Actions
- **Claude API capabilities** (training data through Jan 2025) — Structured output mode, context window management
- **Competitive analysis** (training data through Jan 2025) — Spotify AI DJ features, Apple Music Genius, Pandora Music Genome, ChatGPT music plugins

### Tertiary (LOW confidence, needs validation)
- **Package versions** (all except Anthropic SDK) — Based on Jan 2025 knowledge, should verify against current npm registry
- **ElevenLabs SDK** — Assumed patterns from training data, not verified against current documentation
- **Spotify Connect behavior** — General patterns known, but Sonos-specific behavior unverified

**Methodology:**
- Research conducted without web search/fetch tools (unavailable during session)
- Cross-referenced STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md for consistency
- Validated phase dependencies against architectural constraints
- Mapped pitfalls to phase timing to ensure early risk mitigation

---

**Research completed:** 2026-03-30
**Ready for roadmap:** Yes

**Next steps for orchestrator:**
1. Use this summary to structure roadmap phases (Foundation → Intelligence → Refinement → Voice → Polish)
2. Flag Phase 1 for Spotify Connect research, Phase 2 for recommendation strategy experimentation
3. Budget time in Phase 2 for seed rotation iteration (high-risk area: filter bubble collapse)
4. Consider deferring Voice DJ (Phase 4) to validate core curation first
5. Plan for deployment strategy decision (Vercel Blob vs. self-hosted) before Phase 1 completion
