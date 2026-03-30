# Feature Landscape: AI Music Curator

**Domain:** AI-powered music curation with natural language input
**Researched:** 2026-03-30
**Confidence:** MEDIUM (based on training knowledge through Jan 2025, no live web verification)

## Table Stakes

Features users expect from AI music curators. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Playback controls** | Standard music player behavior | Low | Play/pause/skip/volume — users expect device-like control |
| **Now playing display** | Visual feedback of current state | Low | Album art, track title, artist — confirms system is working |
| **Queue visibility** | Trust in what's coming next | Medium | Users need to see upcoming tracks to trust the AI's choices |
| **Track skip** | Escape hatch for bad picks | Low | Critical safety valve — AI won't be perfect, users need control |
| **Session persistence** | Don't lose the vibe on refresh | Medium | Resume playback state, maintain queue across page reloads |
| **Like/save tracks** | Capture discoveries | Low | Add to library or playlist — core music app behavior |
| **Search fallback** | When NL fails, text search works | Medium | Users expect to type "Miles Davis" and get results if NL doesn't understand |
| **Playback history** | Review what played | Low | "What was that song?" — users need to trace back through session |
| **Volume control** | Basic audio management | Low | Adjust volume without leaving the app |
| **Device selection** | Choose playback target | Medium | For Spotify Connect: select which speaker/device to use |
| **Error recovery** | Graceful degradation | Medium | Handle API failures, expired tokens, device disconnections without crashing |
| **Mobile responsiveness** | Works on phone | Medium | Primary use case is phone on coffee table — must be touch-friendly |

## Differentiators

Features that set this product apart from competitors. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Conversational refinement** | Real-time vibe tuning | High | "Too mellow" / "more like that" → adjusts queue mid-session. Spotify AI DJ lacks this interactivity. |
| **Anti-drift logic** | Prevent genre slide | High | "Cooking hard bop, no ballads" stays hard bop — algorithms often drift to related-but-wrong genres |
| **Voice DJ personality** | Entertainment + context | High | ElevenLabs intros/commentary between tracks. Spotify AI DJ has this; differentiator is *customization*. |
| **Mood-to-music parsing** | Handles abstract descriptions | High | "Friday afternoon coding energy" → upbeat instrumental. Better than Spotify's genre-first search. |
| **Branch from track** | Instant vibe pivot | Medium | Click any track → rebuild queue from that seed. Quick taste exploration. |
| **Discovery bias control** | Popular vs obscure slider | Medium | "Surface lesser-known artists" — addressable parameter vs black-box recommendations |
| **Session playlist auto-save** | Capture the vibe | Low | Auto-generate playlist from session history — makes good sessions replayable |
| **Taste profile learning** | Cross-session memory | High | Remembers "no smooth jazz, no ballads" without re-stating each session |
| **Genre exclusion rules** | Persistent filters | Medium | "Never play X" persists across sessions — Spotify lacks this granularity |
| **Multi-constraint parsing** | Complex vibe descriptions | High | "Upbeat jazz with female vocals, no bebop" → correctly applies all constraints |
| **Dynamic UI theming** | Album art color extraction | Low | Interface adapts to current track's palette — high personality, low effort |
| **Gesture-based controls** | Swipe to skip, hold to save | Medium | Mobile-first interaction patterns — faster than tapping buttons |

## Anti-Features

Features to explicitly NOT build. Avoid scope creep and maintain focus.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Multi-user mode** | Complexity explosion, unclear use case | Single-user for v1. "Whose taste wins?" is unsolved problem. |
| **Playlist editing** | Becomes generic music app | Read-only queue management. Users can save to Spotify and edit there. |
| **Social sharing** | Not a social product | Session playlists can be shared as Spotify links, but no in-app social. |
| **Music upload** | Out of scope | Spotify-only catalog. No local file management. |
| **Lyrics display** | Doesn't serve core value | Spotify app already has this. Adds UI clutter. |
| **Equalizer/audio effects** | Hardware concern | Leave to Sonos/Spotify. Focus on curation, not audio processing. |
| **Podcast support** | Different content type | Music-only. Podcast curation has different requirements. |
| **Wake word activation** | Privacy + complexity | Button-triggered voice input only. No ambient listening. |
| **Cross-platform sync** | Single-user, single-session tool | No need to sync across devices. Use on one device at a time. |
| **Offline playback** | Spotify Premium handles this | Don't duplicate Spotify's offline logic. Requires active connection. |
| **Custom AI training** | Overkill for personal tool | Use Spotify's recommendation API + Claude for interpretation. Don't build/train models. |
| **Extensive analytics** | Not a data product | Simple play counts, no dashboards/charts. Users care about music, not metrics. |

## Feature Dependencies

Features with hard requirements. Build left before right.

```
Basic Playback
  ├─→ Now Playing Display
  ├─→ Playback Controls
  └─→ Volume Control
      └─→ Device Selection (requires playback foundation)

Queue Management
  ├─→ Queue Visibility
  ├─→ Track Skip (requires queue)
  └─→ Queue Reordering (requires visibility + skip)

Natural Language Input
  ├─→ Vibe Interpretation (core AI logic)
  ├─→ Mood-to-Music Parsing (requires interpretation)
  ├─→ Conversational Refinement (requires interpretation + session state)
  └─→ Multi-Constraint Parsing (advanced interpretation)

Session State
  ├─→ Session Persistence (foundation)
  ├─→ Playback History (requires state tracking)
  ├─→ Session Playlist Auto-Save (requires history)
  └─→ Branch from Track (requires history + state)

Taste Learning
  ├─→ Session Memory (short-term)
  ├─→ Taste Profile (long-term, requires DB)
  └─→ Genre Exclusion Rules (requires taste profile)

Discovery Features
  ├─→ Discovery Bias Control (requires recommendation params)
  └─→ Anti-Drift Logic (requires discovery + taste profile)

Voice DJ
  ├─→ Voice Synthesis (ElevenLabs integration)
  ├─→ Track Context Generation (AI commentary)
  └─→ Pre-Generation Logic (requires queue lookahead)

Polish Features
  ├─→ Dynamic UI Theming (requires now playing data)
  ├─→ Gesture Controls (requires mobile UI foundation)
  └─→ Like/Save (requires Spotify write permissions)
```

## MVP Recommendation

**Prioritize for v1:**

1. **Basic Playback** (Now Playing, Controls, Device Selection)
   - Foundation for everything else
   - Users must hear music to validate value prop
   - Complexity: Low-Medium

2. **Queue Management** (Visibility, Skip, History)
   - Trust mechanism — users see what AI chose
   - Escape hatch — skip bad picks
   - Complexity: Medium

3. **Vibe Interpretation** (NL parsing → Spotify params)
   - Core differentiator
   - Validates "describe vibe, hear music" promise
   - Complexity: High

4. **Conversational Refinement** (Real-time feedback loop)
   - Key differentiator vs Spotify AI DJ
   - "Too mellow" → immediate queue adjustment
   - Complexity: High

5. **Session Playlist Auto-Save**
   - Low effort, high value
   - Captures good sessions for replay
   - Complexity: Low

**Defer to v2:**

- **Voice DJ** (complexity high, value unproven)
  - Ship silent first, validate vibe accuracy
  - Add voice after core curation works

- **Taste Profile Persistence** (requires DB, cross-session complexity)
  - Session memory sufficient for v1
  - Add learning after usage patterns emerge

- **Discovery Bias Control** (nice-to-have tuning)
  - Use Spotify's defaults first
  - Add slider after understanding what users want

- **Branch from Track** (requires stable queue foundation)
  - Add after basic queue management proven

- **Anti-Drift Logic** (requires taste profile data)
  - Defer until multi-session patterns reveal drift issues

## Feature Complexity Matrix

| Complexity | Features | Estimated Effort |
|------------|----------|------------------|
| **Low** | Now Playing, Playback Controls, Volume, Track Skip, Like/Save, Playback History, Session Playlist, Dynamic UI Theming | 1-2 days each |
| **Medium** | Queue Visibility, Device Selection, Search Fallback, Session Persistence, Mobile Responsiveness, Discovery Bias, Genre Exclusion, Gesture Controls, Branch from Track | 3-5 days each |
| **High** | Conversational Refinement, Anti-Drift Logic, Voice DJ, Mood-to-Music Parsing, Taste Profile, Multi-Constraint Parsing, Error Recovery | 1-2 weeks each |

## Competitive Landscape Insights

**Spotify AI DJ** (as of Jan 2025):
- Voice commentary between tracks
- Personalized recommendations based on history
- Pre-generated segments (not interactive)
- **Gap:** No mid-session refinement, no natural language input

**Apple Music Genius/Smart Playlists:**
- Rule-based playlist generation
- Genre/mood filters
- **Gap:** No AI interpretation, no conversational interface

**Pandora Music Genome:**
- Detailed music attribute tagging
- Thumbs up/down feedback
- **Gap:** Station-based, not vibe-based; no natural language

**ChatGPT Music Plugins** (various):
- Natural language playlist creation
- Export to Spotify
- **Gap:** Static playlists, no live playback, no refinement loop

**Vibe DJ's White Space:**
1. Natural language vibe input + real-time refinement
2. Anti-drift logic with persistent exclusions
3. Live playback with conversational control
4. Session-aware curation (not just track-to-track)

## Open Questions

**LOW confidence areas needing validation:**

1. **Voice DJ adoption** — Is this desired or gimmicky?
   - Spotify AI DJ has this, but usage data unavailable
   - Risk: Novelty wears off, becomes annoying
   - Mitigation: Make it optional, test with users

2. **Refinement interaction patterns** — How do users want to give feedback?
   - "Too mellow" vs thumbs down vs skip-based learning?
   - Multiple modalities may confuse

3. **Discovery vs familiarity ratio** — What's the right mix?
   - All new = exhausting, all familiar = boring
   - May vary by session type (focus vs party)

4. **Queue length** — How far ahead to generate?
   - Too short = pauses between tracks
   - Too long = refinement feedback comes too late

## Sources

**Confidence Assessment:**
- Training data through January 2025 for general music AI features
- Spotify AI DJ, Apple Music, Pandora features are established (HIGH confidence on table stakes)
- Emerging patterns and competitive gaps are based on pre-2025 knowledge (MEDIUM confidence)
- No live web verification performed (web tools unavailable during research)

**Methodology:**
- Analyzed competitive products: Spotify AI DJ, Apple Music Genius, Pandora, ChatGPT music plugins
- Mapped table stakes from established music app conventions
- Identified differentiators based on PROJECT.md requirements vs competitive gaps
- Anti-features derived from scope constraints and single-user focus
