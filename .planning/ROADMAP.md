# Roadmap: Vibe DJ

## Overview

Vibe DJ transforms natural language mood descriptions into curated Spotify playback. The journey starts with Spotify integration fundamentals (auth, playback, device control), then adds AI curation intelligence (Claude-powered vibe interpretation and Spotify recommendations), followed by refinement capabilities (feedback loops, queue management, taste learning), and finally polish layers (voice personality, dynamic UI, gesture controls). The critical path prioritizes getting music playing quickly (Phases 1-2), delivering core AI value (Phases 3-4), then enhancing the experience (Phases 5-10).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Spotify Foundation** - OAuth authentication, device selection, token management (completed 2026-03-30)
- [ ] **Phase 2: Playback Core** - Now playing display, basic controls, queue visibility
- [ ] **Phase 3: Chat Interface** - Conversational UI, message threading, input handling
- [ ] **Phase 4: AI Curation** - Vibe interpretation (Claude), recommendation engine (Spotify), session memory
- [ ] **Phase 5: Refinement Loop** - Real-time feedback, queue adjustments, search fallback
- [ ] **Phase 6: Queue Management** - Track actions (like/save), queue manipulation, history scrolling
- [ ] **Phase 7: Session Persistence** - State persistence, auto-save playlists, session recovery
- [ ] **Phase 8: Taste Profile** - Cross-session memory, anti-drift logic, preference learning
- [ ] **Phase 9: Voice DJ** - ElevenLabs voice synthesis, anticipatory generation, voice controls
- [ ] **Phase 10: Visual Polish** - Dynamic accent colors, spring animations, gesture controls

## Phase Details

### Phase 1: Spotify Foundation
**Goal**: Users can authenticate with Spotify and control playback on Sonos speakers
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, UI-03
**Success Criteria** (what must be TRUE):
  1. User can log in via Spotify OAuth (PKCE flow) and stay authenticated across sessions
  2. User can select Sonos speaker from device list as playback target
  3. User can transfer playback between devices without errors
  4. Expired tokens refresh automatically without requiring re-authentication
  5. Token refresh race conditions handled gracefully (no 401 cascades)
**Plans**: TBD

### Phase 2: Playback Core
**Goal**: Users see current playback state and control music like a standard player
**Depends on**: Phase 1
**Requirements**: PLAY-01, PLAY-02, PLAY-03, PLAY-05, UI-01
**Success Criteria** (what must be TRUE):
  1. User sees album art, track title, artist, and playback progress updating in real-time
  2. User can play, pause, skip forward, skip back, and adjust volume
  3. User sees next 5-10 tracks in upcoming queue
  4. User sees scrollable history of played tracks in current session
  5. Interface is touch-friendly on mobile (primary use case: phone on coffee table)
**Plans**: TBD
**UI hint**: yes

### Phase 3: Chat Interface
**Goal**: Users can describe vibes conversationally in a chat-style interface
**Depends on**: Phase 2
**Requirements**: CURA-01, UI-01
**Success Criteria** (what must be TRUE):
  1. User can type natural language messages in chat input field
  2. User messages and AI responses display in threaded conversation format
  3. Loading state shows while AI processes request (visual feedback under 3 seconds)
  4. Chat history persists during session (survives page reloads)
  5. Error messages display clearly with retry options
**Plans**: TBD
**UI hint**: yes

### Phase 4: AI Curation
**Goal**: Natural language vibe descriptions translate into playing Spotify tracks
**Depends on**: Phase 3
**Requirements**: CURA-02, CURA-03, CURA-04, CURA-06
**Success Criteria** (what must be TRUE):
  1. User types "cooking hard bop, no ballads" and hears hard bop jazz within 5 seconds
  2. Abstract descriptions ("Friday afternoon coding energy") map to appropriate energy/genre combinations
  3. Exclusions ("no smooth jazz") are respected throughout session
  4. Queue includes 10-20 tracks matching vibe without filter bubble collapse (doesn't converge on 3-4 artists)
  5. Session memory prevents track repeats and remembers excluded genres
**Plans**: TBD

### Phase 5: Refinement Loop
**Goal**: Users adjust the vibe in real-time with natural feedback
**Depends on**: Phase 4
**Requirements**: CURA-05, CURA-06
**Success Criteria** (what must be TRUE):
  1. User says "too mellow" and queue adjusts to higher energy within 5 seconds
  2. User says "more like that one" and queue seeds from current track
  3. User says "no more X" and genre/artist excluded for rest of session
  4. Quick action buttons provide one-tap feedback for common adjustments
  5. Search fallback works when natural language interpretation fails
**Plans**: TBD

### Phase 6: Queue Management
**Goal**: Users interact with individual tracks and control queue order
**Depends on**: Phase 5
**Requirements**: PLAY-04, PLAY-06
**Success Criteria** (what must be TRUE):
  1. User can like track (adds to Spotify Liked Songs) with visual confirmation
  2. User can save track to playlist via picker modal
  3. User can remove track from queue or clear entire queue
  4. User can reorder queue via drag-and-drop on mobile
  5. "More like this" and "Less like this" actions trigger refinement immediately
**Plans**: TBD
**UI hint**: yes

### Phase 7: Session Persistence
**Goal**: Playback state and queue survive page reloads and create session playlists
**Depends on**: Phase 6
**Requirements**: PERS-01, PERS-02, UI-03
**Success Criteria** (what must be TRUE):
  1. Queue state survives page reload (browser refresh doesn't lose upcoming tracks)
  2. Chat history survives page reload (conversation context persists)
  3. Vibe constraints survive page reload ("no ballads" remembered after refresh)
  4. Session complete creates Spotify playlist with all played tracks
  5. Playlist automatically named with date/time or vibe description
**Plans**: TBD

### Phase 8: Taste Profile
**Goal**: User preferences persist across sessions and prevent genre drift
**Depends on**: Phase 7
**Requirements**: PERS-03, PERS-04
**Success Criteria** (what must be TRUE):
  1. Genre exclusions ("never smooth jazz") apply automatically to new sessions
  2. Artist preferences (liked/disliked) influence future recommendations
  3. Anti-drift logic prevents "cooking hard bop" from sliding to smooth jazz or R&B
  4. User can view and edit taste profile (clear preferences, remove exclusions)
  5. Taste profile stored in SQLite and survives app redeployment
**Plans**: TBD

### Phase 9: Voice DJ
**Goal**: AI voice personality introduces tracks with natural commentary
**Depends on**: Phase 2 (playback state for timing)
**Requirements**: VOICE-01
**Success Criteria** (what must be TRUE):
  1. Voice intro plays before track starts with no audible latency (pre-generated 30-60s early)
  2. Commentary is contextually relevant (references track, artist, vibe context)
  3. User can enable/disable voice DJ without affecting core playback
  4. Voice personality can be customized (tone, style)
  5. Voice generation failures degrade gracefully (silent playback continues)
**Plans**: TBD

### Phase 10: Visual Polish
**Goal**: Interface feels animated, responsive, and visually dynamic
**Depends on**: Phase 2 (base UI to polish)
**Requirements**: UI-02, UI-04, UI-05
**Success Criteria** (what must be TRUE):
  1. UI accent colors extract from album art and crossfade smoothly on track change
  2. Framer Motion spring animations applied throughout (no abrupt transitions)
  3. Swipe gestures work for common actions (swipe to skip, hold to save)
  4. Queue reordering drag-and-drop feels smooth with spring physics
  5. User can branch queue from any track in history ("more like this song")
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Spotify Foundation | 0/TBD | Complete    | 2026-03-30 |
| 2. Playback Core | 0/TBD | Not started | - |
| 3. Chat Interface | 0/TBD | Not started | - |
| 4. AI Curation | 0/TBD | Not started | - |
| 5. Refinement Loop | 0/TBD | Not started | - |
| 6. Queue Management | 0/TBD | Not started | - |
| 7. Session Persistence | 0/TBD | Not started | - |
| 8. Taste Profile | 0/TBD | Not started | - |
| 9. Voice DJ | 0/TBD | Not started | - |
| 10. Visual Polish | 0/TBD | Not started | - |
