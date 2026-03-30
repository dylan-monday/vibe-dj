# Vibe DJ - Requirements v1.0

**Milestone:** v1.0 MVP
**Created:** 2026-03-30
**Based on:** PROJECT.md, SPEC.docx, Research Summary

---

## Authentication & Setup

### AUTH-01: Spotify OAuth Authentication
**Priority:** P0 - Critical
**Type:** Table Stakes

User can authenticate with Spotify via OAuth 2.0 PKCE flow. Browser-based, no server secrets required. Uses `@spotify/web-api-ts-sdk` for built-in PKCE support.

**Acceptance Criteria:**
- [ ] Login button triggers OAuth flow
- [ ] Redirect callback handles token exchange
- [ ] Tokens stored securely (httpOnly cookies or secure storage)
- [ ] Logout clears all session data
- [ ] Handles expired token gracefully (auto-refresh)

**Research Notes:** Singleton token manager with proactive refresh at 50 minutes. Queue requests during refresh to prevent 401 cascades.

---

### AUTH-02: Device Selection (Spotify Connect)
**Priority:** P0 - Critical
**Type:** Table Stakes

User can select which Spotify Connect device to use for playback, including Sonos speakers.

**Acceptance Criteria:**
- [ ] Displays list of available devices
- [ ] Shows device type icons (speaker, phone, computer)
- [ ] Indicates currently active device
- [ ] User can transfer playback to selected device
- [ ] Handles "no active device" state gracefully

**Research Notes:** Device name matching may be inconsistent. May need manual picker UI vs. automatic selection.

---

## Playback Core

### PLAY-01: Now Playing Display
**Priority:** P0 - Critical
**Type:** Table Stakes

User sees current playback state with album art as hero element per spec design direction.

**Acceptance Criteria:**
- [ ] Album art displayed prominently (hero element)
- [ ] Track title, artist name, album name visible
- [ ] Playback progress bar with elapsed/remaining time
- [ ] Indicates play/pause state visually
- [ ] Updates via 3-second polling interval
- [ ] Handles "nothing playing" state

**Design:** Dark synthwave aesthetic — deep purples, magentas, cyans. Album art as frame that disappears when not interacting.

---

### PLAY-02: Playback Controls
**Priority:** P0 - Critical
**Type:** Table Stakes

User can control playback with standard music player controls.

**Acceptance Criteria:**
- [ ] Play/pause toggle
- [ ] Skip to next track
- [ ] Skip to previous track
- [ ] Volume slider with mute toggle
- [ ] Controls respond immediately (optimistic UI)
- [ ] Graceful degradation on API errors

---

### PLAY-03: Queue Visibility
**Priority:** P0 - Critical
**Type:** Table Stakes

User sees upcoming tracks to build trust in AI curation.

**Acceptance Criteria:**
- [ ] Displays next 5-10 tracks in queue
- [ ] Shows album art, track name, artist for each
- [ ] Indicates current track position
- [ ] Updates when queue changes
- [ ] Scrollable for longer queues

**Research Notes:** Spotify queue API is write-only. App maintains its own queue state. Choice: playlist-based (visible in Spotify) or URI-based (app-only, faster).

---

### PLAY-04: Queue Management
**Priority:** P1 - High
**Type:** Table Stakes

User can manipulate the queue.

**Acceptance Criteria:**
- [ ] Remove track from queue
- [ ] Reorder tracks via drag-and-drop
- [ ] Clear entire queue
- [ ] Add track to queue from search results

**Research Notes:** Since Spotify queue is write-only, manage via playlist or URI array. Accept that queue only visible in app, not Spotify clients.

---

### PLAY-05: Playback History
**Priority:** P1 - High
**Type:** Table Stakes

User can see what tracks have played in the session.

**Acceptance Criteria:**
- [ ] Scrollable list of played tracks
- [ ] Album art, track name, artist for each
- [ ] Most recent at top
- [ ] Click to expand track details
- [ ] Persists across page reloads (session scope)

---

### PLAY-06: Track Actions
**Priority:** P1 - High
**Type:** Table Stakes

User can save or interact with individual tracks.

**Acceptance Criteria:**
- [ ] Like track (add to Liked Songs)
- [ ] Save to playlist (picker modal)
- [ ] Unlike track (remove from Liked Songs)
- [ ] Visual indicator for already-liked tracks
- [ ] "More like this" action (triggers refinement)
- [ ] "Less like this" action (triggers exclusion)

---

## AI Curation

### CURA-01: Chat Interface
**Priority:** P0 - Critical
**Type:** Differentiator

User interacts via conversational chat input to describe vibes.

**Acceptance Criteria:**
- [ ] Text input field always accessible
- [ ] Send button and Enter key submit
- [ ] Messages displayed in chat thread format
- [ ] AI responses clearly distinguished
- [ ] Loading state during AI processing
- [ ] Error state with retry option

**Design:** Chat interface per spec — conversational input for vibe descriptions.

---

### CURA-02: Vibe Interpretation
**Priority:** P0 - Critical
**Type:** Differentiator

Parse natural language mood/energy/genre descriptions into Spotify API parameters.

**Acceptance Criteria:**
- [ ] Handles abstract descriptions ("Friday afternoon coding energy")
- [ ] Handles specific genres ("cooking hard bop")
- [ ] Handles exclusions ("no ballads", "no smooth jazz")
- [ ] Handles multi-constraint input ("upbeat jazz with female vocals")
- [ ] Returns structured output: `{ genres, energy, valence, tempo, instrumentalness }`
- [ ] Response time < 3 seconds (Claude Sonnet)

**Research Notes:** Use Claude for intent parsing only, not music expertise. Structured JSON output. Never let LLM directly query Spotify.

---

### CURA-03: Recommendation Engine
**Priority:** P0 - Critical
**Type:** Differentiator

Convert interpreted vibe into Spotify tracks.

**Acceptance Criteria:**
- [ ] Maps vibe attributes to Spotify Recommendations API params
- [ ] Aggressive seed rotation (never reuse same seed in session)
- [ ] Injects diversity (20% discovery, 80% familiar)
- [ ] Avoids "filter bubble collapse" (converging on 3-4 artists)
- [ ] Validates all suggestions via Spotify Search (no hallucinated tracks)
- [ ] Returns 10-20 track queue

---

### CURA-04: Session Memory
**Priority:** P0 - Critical
**Type:** Differentiator

Maintain conversation context within a session.

**Acceptance Criteria:**
- [ ] Remembers vibe constraints within session
- [ ] Tracks played songs (no repeats)
- [ ] Tracks excluded genres/artists
- [ ] Context window: last 10-20 messages
- [ ] Persists across page reloads (session scope)

---

### CURA-05: Refinement Loop
**Priority:** P0 - Critical
**Type:** Differentiator

Accept real-time feedback and adjust queue.

**Acceptance Criteria:**
- [ ] "Too mellow" → increases energy, replaces upcoming tracks
- [ ] "More like that one" → seeds from current track
- [ ] "No more X" → excludes genre/artist for session
- [ ] Quick action buttons for common feedback
- [ ] Natural language feedback also works
- [ ] Response time < 5 seconds for queue adjustment

---

### CURA-06: Search Fallback
**Priority:** P1 - High
**Type:** Table Stakes

When NL interpretation fails, text search works.

**Acceptance Criteria:**
- [ ] Search field for direct artist/track/album lookup
- [ ] Autocomplete suggestions
- [ ] Results grouped by type (tracks, artists, albums)
- [ ] Click to play immediately or add to queue

---

## Persistence

### PERS-01: Session Persistence
**Priority:** P1 - High
**Type:** Table Stakes

Resume playback state across page reloads.

**Acceptance Criteria:**
- [ ] Queue state survives page reload
- [ ] Chat history survives page reload
- [ ] Vibe context survives page reload
- [ ] Uses localStorage or sessionStorage
- [ ] Handles stale state gracefully

---

### PERS-02: Session Playlist Auto-Save
**Priority:** P1 - High
**Type:** Differentiator

Auto-generate playlist from session tracks.

**Acceptance Criteria:**
- [ ] Creates Spotify playlist at session end
- [ ] Playlist named with date/time or vibe description
- [ ] All played tracks included
- [ ] User can optionally skip creation
- [ ] Playlist visible in user's Spotify library

---

### PERS-03: Taste Profile (Persistent)
**Priority:** P2 - Medium
**Type:** Differentiator

Persistent user preferences across sessions.

**Acceptance Criteria:**
- [ ] Stores genre exclusions ("never smooth jazz")
- [ ] Stores artist preferences (liked/disliked)
- [ ] Stores energy/mood patterns
- [ ] SQLite persistence (via API routes)
- [ ] Applied automatically to new sessions
- [ ] User can edit/clear preferences

**Research Notes:** Defer to Phase 3. Session memory (CURA-04) sufficient for v1.

---

### PERS-04: Anti-Drift Logic
**Priority:** P2 - Medium
**Type:** Differentiator

Prevent recommendations from sliding to unwanted genres.

**Acceptance Criteria:**
- [ ] Detects genre drift (jazz → smooth jazz → R&B)
- [ ] Enforces exclusion rules from taste profile
- [ ] Applies constraints to all recommendation calls
- [ ] Stores exclusions, not hard filters (soft penalties)

**Research Notes:** Requires taste profile data. Defer to Phase 3.

---

## Voice DJ

### VOICE-01: Voice DJ Personality
**Priority:** P3 - Low (Deferred)
**Type:** Differentiator

ElevenLabs-powered track intros and commentary.

**Acceptance Criteria:**
- [ ] Voice intro plays before track starts
- [ ] Natural commentary based on track/vibe context
- [ ] No audible latency (pre-generated 30-60s early)
- [ ] User can enable/disable voice DJ
- [ ] Voice personality customizable

**Research Notes:** Ship silent first. Validate curation accuracy before adding voice.

---

## UI/UX

### UI-01: Mobile Responsiveness
**Priority:** P0 - Critical
**Type:** Table Stakes

Primary use case is phone on coffee table.

**Acceptance Criteria:**
- [ ] Touch-friendly tap targets (min 44x44px)
- [ ] Responsive layout (mobile-first)
- [ ] Swipe gestures for common actions
- [ ] Portrait and landscape support
- [ ] No horizontal scroll on mobile

---

### UI-02: Dynamic Accent Colors
**Priority:** P2 - Medium
**Type:** Differentiator

Extract accent colors from album art.

**Acceptance Criteria:**
- [ ] Extracts dominant colors from album art
- [ ] Applies to UI accents (borders, highlights)
- [ ] Smooth crossfade on track change
- [ ] Falls back to default purple/magenta palette

**Design:** Dark synthwave base with dynamic accent overlay.

---

### UI-03: Error Recovery
**Priority:** P1 - High
**Type:** Table Stakes

Graceful degradation on API failures.

**Acceptance Criteria:**
- [ ] Handles 401 (expired token) → auto-refresh or re-auth
- [ ] Handles 429 (rate limit) → exponential backoff
- [ ] Handles 5xx → retry with user notification
- [ ] Handles device disconnection → prompt re-selection
- [ ] Core playback works even if AI services fail
- [ ] Clear error messages, actionable recovery options

---

### UI-04: Animation & Polish
**Priority:** P2 - Medium
**Type:** Differentiator

Spring physics and gesture tracking per spec.

**Acceptance Criteria:**
- [ ] Framer Motion spring animations throughout
- [ ] Crossfade transitions between tracks
- [ ] Gesture-based controls (swipe to skip, hold to save)
- [ ] Smooth queue reordering drag-and-drop
- [ ] Loading skeletons for async content

---

### UI-05: Branch from Track
**Priority:** P3 - Low (Deferred)
**Type:** Differentiator

Rebuild queue seeded from any track.

**Acceptance Criteria:**
- [ ] Click any track in history → "Branch from here"
- [ ] Queue rebuilds with track as seed
- [ ] Maintains current vibe constraints
- [ ] Quick way to explore similar music

**Research Notes:** Requires stable queue foundation. Defer to Phase 5.

---

## Out of Scope (v1)

These are explicitly NOT included in v1:

- **Native mobile app** — Web-first, mobile later
- **Apple Music support** — Spotify-only for v1
- **Multi-user mode** — Single-user for v1
- **Wake word activation** — Voice input via button only
- **Sonos audio clip injection** — Requires newer hardware
- **Real-time WebSocket updates** — Polling is sufficient
- **Authenticity filter** — Ghost artist detection deferred
- **Playlist editing** — Read-only queue; edit in Spotify
- **Social sharing** — Not a social product
- **Lyrics display** — Spotify already has this
- **Equalizer/audio effects** — Hardware concern
- **Podcast support** — Music-only

---

## Priority Legend

| Priority | Meaning | Phase Target |
|----------|---------|--------------|
| P0 | Critical — Core value, must ship | Phase 1-4 |
| P1 | High — Expected, users will notice absence | Phase 5-7 |
| P2 | Medium — Differentiators, but not launch-blocking | Phase 8-10 |
| P3 | Low — Nice-to-have, defer or cut if needed | Phase 9-10 / v1.1 |

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| UI-03 | Phase 1 | Pending |
| PLAY-01 | Phase 2 | Pending |
| PLAY-02 | Phase 2 | Pending |
| PLAY-03 | Phase 2 | Pending |
| PLAY-05 | Phase 2 | Pending |
| UI-01 | Phase 2 | Pending |
| CURA-01 | Phase 3 | Pending |
| CURA-02 | Phase 4 | Pending |
| CURA-03 | Phase 4 | Pending |
| CURA-04 | Phase 4 | Pending |
| CURA-06 | Phase 4 | Pending |
| CURA-05 | Phase 5 | Pending |
| PLAY-04 | Phase 6 | Pending |
| PLAY-06 | Phase 6 | Pending |
| PERS-01 | Phase 7 | Pending |
| PERS-02 | Phase 7 | Pending |
| PERS-03 | Phase 8 | Pending |
| PERS-04 | Phase 8 | Pending |
| VOICE-01 | Phase 9 | Pending |
| UI-02 | Phase 10 | Pending |
| UI-04 | Phase 10 | Pending |
| UI-05 | Phase 10 | Pending |

**Coverage:** 24/30 v1 requirements mapped (100% of prioritized requirements)

**Note:** Requirements not explicitly mapped to phases are lower-priority enhancements covered within existing phase scope or integrated across multiple phases.

---

*Generated by GSD workflow from PROJECT.md and research synthesis*
