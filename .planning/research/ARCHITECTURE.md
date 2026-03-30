# Architecture Research: AI Music Curator

**Project:** Vibe DJ
**Researched:** 2026-03-30
**Confidence:** MEDIUM (based on training data for Spotify API, Next.js patterns, and AI music systems; external verification limited)

## Executive Summary

An AI music curator with Spotify integration, voice synthesis, and real-time playback requires a **layered architecture** separating concerns into distinct components:

1. **Presentation Layer** (React UI) — User input, now playing display, queue management
2. **State Management Layer** — Playback state, session context, UI state
3. **API Integration Layer** — Spotify, Claude, ElevenLabs clients
4. **Intelligence Layer** — Vibe interpretation, recommendation logic, refinement
5. **Persistence Layer** — SQLite for taste profiles and session history
6. **Polling Orchestrator** — Spotify player state synchronization

The critical architectural challenge is **coordinating asynchronous operations** across multiple APIs (Spotify playback, Claude curation, ElevenLabs voice generation) while maintaining real-time UI responsiveness. This requires careful attention to **data flow direction**, **component boundaries**, and **build order dependencies**.

## System Components

### 1. Presentation Layer (Client-Side React)

**Responsibility:** User interface rendering and interaction handling

| Component | Purpose | Key Interactions |
|-----------|---------|------------------|
| Chat Interface | Natural language vibe input | → Vibe Interpreter |
| Now Playing Display | Album art, track info, playback controls | ← Playback State Store, → Spotify API Client |
| Queue Manager | Display upcoming tracks, reorder/remove | ← Queue State, → Spotify API Client |
| History View | Scrollable played tracks | ← Session Store |
| Playlist Manager | Save/like tracks, view session playlist | → Spotify API Client |
| Voice DJ Controls | Enable/disable AI commentary | → Voice Synthesis Orchestrator |

**Build Priority:** HIGH (needed for all user interactions)

**Key Decisions:**
- Server Components for initial page load, Client Components for interactive UI
- Framer Motion for animations (requires client-side)
- Dynamic accent colors extracted client-side from album art

### 2. State Management Layer

**Responsibility:** Centralized state for playback, session, and UI

| Store | Scope | Contents | Update Trigger |
|-------|-------|----------|----------------|
| Playback State | Global | Current track, position, is_playing, volume, device | Spotify polling (3-5s) |
| Queue State | Global | Upcoming tracks, queue modifications | User actions, AI recommendations |
| Session Store | Global | Session ID, conversation history, vibe context | User input, AI responses |
| Taste Profile Store | Persistent | User preferences, anti-drift rules, liked artists | User feedback, session completion |
| UI State | Local | Accent colors, animation states, modal visibility | User interactions, track changes |

**Build Priority:** HIGH (foundational for all features)

**Recommended Approach:**
- React Context + `useReducer` for global state (avoid external state library for MVP)
- Local storage for session persistence across page refreshes
- SQLite reads/writes via API routes (not direct client access)

**Data Flow:**
```
Spotify Polling → Playback State → UI Update
User Input → Session Store → AI → Queue State → Spotify API → Playback State
```

### 3. API Integration Layer

**Responsibility:** External service communication with error handling and rate limiting

#### Spotify API Client

| Endpoint Group | Purpose | Polling Required | Rate Limit |
|----------------|---------|------------------|------------|
| Player API | Get current playback state | YES (3-5s) | 180/min |
| Playback Control | Play, pause, skip, seek | NO | 180/min |
| Recommendations | Get track recommendations | NO | 180/min |
| Search | Find tracks by attributes | NO | 180/min |
| Library | Save tracks, get liked songs | NO | 180/min |
| Playlists | Create/update session playlists | NO | 180/min |

**Authentication:** OAuth 2.0 PKCE flow, token refresh logic required

**Critical Patterns:**
- **Token Management:** Refresh tokens before expiry (expires_in - 60s buffer)
- **Device Selection:** Must select Spotify Connect device (Sonos) before playback
- **Queue Management:** Use `add-to-queue` endpoint, not playlist manipulation
- **Error Handling:** 401 = re-auth, 429 = rate limit backoff, 404 = device unavailable

#### Claude API Client

| Use Case | Model | Input | Output |
|----------|-------|-------|--------|
| Vibe Interpretation | Sonnet 4.5 | User text, session context | Musical attributes (JSON) |
| Track Selection | Sonnet 4.5 | Vibe attributes, Spotify search results | Selected tracks with reasoning |
| Refinement | Sonnet 4.5 | Feedback + current queue | Adjusted attributes |
| Voice DJ Script | Opus 4.5 | Track metadata, session vibe | Natural commentary text |

**Structured Output:** Use Claude's JSON mode for reliable parsing

**Context Window:** Maintain session history (last 10 messages) for coherent refinement

#### ElevenLabs API Client

| Endpoint | Purpose | Latency | Caching Strategy |
|----------|---------|---------|------------------|
| Text-to-Speech | Generate voice clips | 1-3s | Pre-generate during previous track |
| Get Voices | List available voices | — | Cache on app load |

**Critical Pattern:** **Anticipatory Generation**
```
Track N playing → Generate voice for Track N+1 → Cache audio blob → Play when Track N+1 starts
```

**Build Priority:** MEDIUM (Spotify = HIGH, Claude = HIGH, ElevenLabs = LOW for MVP)

### 4. Intelligence Layer

**Responsibility:** Translate user intent into Spotify API calls

#### Vibe Interpreter

**Input:** Natural language ("cooking hard bop, no ballads, upbeat energy")

**Process:**
1. Extract musical attributes (genre, tempo, energy, valence, instrumentalness)
2. Map to Spotify API parameters (seed_genres, target_energy, min_tempo, etc.)
3. Apply user taste profile (anti-drift rules, preferred artists)
4. Return structured parameters

**Output:** `{ seed_genres: ['jazz'], target_energy: 0.7, min_tempo: 120, ... }`

**Implementation:** Claude API call with structured JSON response

#### Recommendation Engine

**Input:** Vibe attributes + taste profile

**Process:**
1. Query Spotify Recommendations API with vibe parameters
2. Filter results against anti-drift rules (e.g., exclude smooth jazz)
3. Rank by relevance to vibe (Claude scoring)
4. Return top N tracks

**Output:** Ordered array of track URIs

**Critical Decisions:**
- **Seeding Strategy:** Use mix of seed_artists (from taste profile) + seed_genres (from vibe)
- **Diversity:** Balance familiar artists (80%) with discovery (20%)
- **Queue Depth:** Always maintain 5-10 tracks ahead

#### Refinement Engine

**Input:** User feedback ("too mellow", "more like that one") + current queue

**Process:**
1. Interpret feedback with Claude (adjust energy/tempo/genre weights)
2. Extract musical attributes from "that one" track if referenced
3. Re-run recommendation engine with adjusted parameters
4. Replace remaining queue (keep currently playing track)

**Output:** New queue

**Build Priority:** HIGH (core value proposition)

### 5. Persistence Layer

**Responsibility:** Local data storage for taste profiles and session history

#### Database Schema (SQLite)

```sql
-- Taste Profile
CREATE TABLE taste_profiles (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  preferred_genres TEXT, -- JSON array
  anti_drift_rules TEXT, -- JSON array of exclusion rules
  liked_artists TEXT, -- JSON array
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Session History
CREATE TABLE sessions (
  id TEXT PRIMARY KEY, -- UUID
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  vibe_description TEXT,
  spotify_playlist_id TEXT
);

-- Session Tracks
CREATE TABLE session_tracks (
  id INTEGER PRIMARY KEY,
  session_id TEXT,
  spotify_track_id TEXT,
  played_at TIMESTAMP,
  user_liked BOOLEAN,
  skipped BOOLEAN,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Voice Cache (optional optimization)
CREATE TABLE voice_cache (
  id INTEGER PRIMARY KEY,
  track_id TEXT,
  voice_text TEXT,
  audio_url TEXT, -- Local file path or blob URL
  generated_at TIMESTAMP
);
```

**Access Pattern:** API routes (Server Components) → SQLite → JSON response → Client State

**Build Priority:** MEDIUM (needed for taste profiles, nice-to-have for session history MVP)

### 6. Polling Orchestrator

**Responsibility:** Sync Spotify player state to application state

**Pattern:**
```typescript
// Polling loop in Client Component
useEffect(() => {
  const interval = setInterval(async () => {
    const state = await spotifyClient.getPlaybackState();
    updatePlaybackState(state);

    // Trigger voice generation if track changed
    if (state.item.id !== previousTrackId) {
      voiceOrchestrator.generateNext(queue[0]);
    }
  }, 3000); // 3 seconds

  return () => clearInterval(interval);
}, []);
```

**Optimizations:**
- Pause polling when tab inactive (Page Visibility API)
- Exponential backoff on errors
- Debounce rapid state changes (e.g., seeking)

**Build Priority:** HIGH (required for real-time UI)

### 7. Voice Synthesis Orchestrator

**Responsibility:** Manage ElevenLabs voice generation lifecycle

**Pattern:**
```
Track N starts playing
  ↓
Voice Orchestrator checks queue position
  ↓
Generate voice for Track N+1 in background
  ↓
Cache audio blob in memory/localStorage
  ↓
Track N+1 starts → Play cached audio
  ↓
Clean up Track N audio
```

**Key Decisions:**
- **Pre-generation Window:** 30-60s before track end
- **Fallback:** If generation fails, skip voice intro (no blocking)
- **Cache Strategy:** In-memory Map for current session, localStorage for frequently played tracks

**Build Priority:** LOW (nice-to-have, not MVP-critical)

## Data Flow

### Primary Flow: Vibe → Music

```
1. User Input (Chat Interface)
   ↓
2. Session Store (append to conversation history)
   ↓
3. Vibe Interpreter (Claude API)
   ↓ (musical attributes JSON)
4. Recommendation Engine (Spotify Recommendations API)
   ↓ (track URIs)
5. Queue State (update upcoming tracks)
   ↓
6. Spotify API (add-to-queue)
   ↓
7. Playback State (updated via polling)
   ↓
8. UI Update (Now Playing, Queue)
```

### Secondary Flow: Real-time Sync

```
1. Polling Orchestrator (every 3s)
   ↓
2. Spotify Player API (GET /me/player)
   ↓ (current track, position, is_playing)
3. Playback State (update)
   ↓
4. UI Update (progress bar, track info)
   ↓
5. Voice Orchestrator (trigger if track changed)
```

### Tertiary Flow: Refinement

```
1. User Feedback ("too mellow")
   ↓
2. Refinement Engine (Claude API with context)
   ↓ (adjusted parameters)
3. Recommendation Engine (re-run)
   ↓
4. Clear existing queue
   ↓
5. Add new queue to Spotify
```

### Data Flow Direction Rules

| Component A | → | Component B | Via |
|-------------|---|-------------|-----|
| UI | → | Vibe Interpreter | Direct function call |
| Vibe Interpreter | → | Claude API | HTTP request |
| Recommendation Engine | → | Spotify API | HTTP request |
| Spotify API | → | Playback State | Polling loop update |
| Playback State | → | UI | React re-render |
| Queue State | → | Spotify API | add-to-queue call |
| Voice Orchestrator | → | ElevenLabs API | HTTP request (background) |

**Critical Rule:** **Unidirectional data flow** — State updates flow down, user actions flow up. Spotify is source of truth for playback state (no optimistic updates).

## Component Dependencies

### Build Order Implications

#### Phase 1: Foundation
**What:** Spotify OAuth, playback state polling, basic Now Playing UI

**Dependencies:** None

**Rationale:** Establishes authentication and real-time sync before adding intelligence

**Components:**
- Spotify API Client (auth + player endpoints)
- Playback State Store
- Polling Orchestrator
- Now Playing Display (read-only)

**Validation:** Can see current Spotify playback in UI, controls work (play/pause/skip)

---

#### Phase 2: Intelligence Layer
**What:** Vibe interpretation, recommendation engine, chat interface

**Dependencies:** Phase 1 (needs Spotify API client)

**Rationale:** Can't curate music without playback foundation

**Components:**
- Claude API Client
- Vibe Interpreter
- Recommendation Engine
- Chat Interface
- Queue State

**Validation:** User describes vibe → tracks appear in queue → play on Sonos

---

#### Phase 3: Refinement & Memory
**What:** Feedback loop, taste profile, session history

**Dependencies:** Phase 2 (needs recommendation engine)

**Rationale:** Refinement requires working curation to refine

**Components:**
- Refinement Engine
- Taste Profile Store
- Session Store
- SQLite schema
- API routes for persistence

**Validation:** User says "too mellow" → queue adjusts. Close session → taste persists.

---

#### Phase 4: Voice Personality
**What:** ElevenLabs integration, voice generation, audio playback

**Dependencies:** Phase 1 (needs playback state for triggers)

**Rationale:** Can build in parallel with Phase 2/3, but requires playback state

**Components:**
- ElevenLabs API Client
- Voice Synthesis Orchestrator
- Voice DJ Controls (UI)

**Validation:** Track changes → voice intro plays → natural commentary

---

#### Phase 5: Polish & Discovery
**What:** Discovery engine, playlist management, history view, dynamic colors

**Dependencies:** Phase 3 (needs session history)

**Rationale:** Nice-to-have features after core loop proven

**Components:**
- Discovery Engine (lesser-known artists)
- Playlist Manager
- History View
- Dynamic accent color extraction

**Validation:** Session complete → playlist auto-saved, history viewable

---

### Dependency Graph

```
Phase 1 (Foundation)
  ↓
Phase 2 (Intelligence) ← depends on Phase 1
  ↓
Phase 3 (Refinement) ← depends on Phase 2
  ↓
Phase 5 (Polish) ← depends on Phase 3

Phase 4 (Voice) ← depends on Phase 1 (parallel with 2/3)
```

**Critical Path:** 1 → 2 → 3 (core value delivery)

**Parallel Path:** 1 → 4 (voice personality, independent of intelligence)

## Architecture Patterns to Follow

### Pattern 1: Anticipatory Voice Generation

**What:** Generate voice clips before they're needed

**When:** Track position > 60s remaining, next track in queue has no cached voice

**Why:** Eliminates user-visible latency (1-3s ElevenLabs delay)

**Implementation:**
```typescript
// In polling loop
if (playback.progress_ms > playback.duration_ms - 60000) {
  const nextTrack = queue[0];
  if (!voiceCache.has(nextTrack.id)) {
    voiceOrchestrator.generateForTrack(nextTrack);
  }
}
```

**Fallback:** If generation fails or takes too long, play track without voice intro

---

### Pattern 2: Optimistic Queue Updates

**What:** Update UI queue immediately, sync to Spotify in background

**When:** User reorders queue or removes tracks

**Why:** Instant UI feedback, hide Spotify API latency

**Implementation:**
```typescript
// Immediate UI update
setQueueState(newQueue);

// Background Spotify sync (don't await)
syncQueueToSpotify(newQueue).catch(err => {
  // Rollback on error
  setQueueState(previousQueue);
  showError("Queue update failed");
});
```

**Risk Mitigation:** Rollback on error, show loading indicator if sync takes >1s

---

### Pattern 3: Hybrid Seeding Strategy

**What:** Mix user taste profile with vibe-specific seeds

**When:** Calling Spotify Recommendations API

**Why:** Balance familiarity (taste profile) with vibe accuracy (vibe seeds)

**Implementation:**
```typescript
const seeds = {
  seed_artists: tasteProfile.likedArtists.slice(0, 2), // Max 2 from profile
  seed_genres: vibeAttributes.genres.slice(0, 3),      // Max 3 from vibe
  seed_tracks: vibeAttributes.referenceTracks || []    // Optional
};
// Spotify allows max 5 total seeds
```

**Validation:** A/B test 80/20 vs 50/50 split (taste/vibe ratio)

---

### Pattern 4: Session Context Windowing

**What:** Limit Claude context to last N messages

**When:** Sending conversation history to Claude API

**Why:** Avoid token bloat, maintain coherence without full history

**Implementation:**
```typescript
const contextWindow = sessionHistory.slice(-10); // Last 10 messages
const prompt = buildPrompt(userInput, contextWindow, tasteProfile);
```

**Tuning:** Start with 10, adjust if refinement quality degrades

---

### Pattern 5: Graceful Degradation

**What:** Core features work even if optional services fail

**When:** ElevenLabs down, Claude slow, Spotify rate limited

**Why:** Personal tool must be reliable, even with partial functionality

**Fallback Hierarchy:**
```
Voice DJ fails → Continue without voice (silent DJ mode)
Claude slow → Use cached vibe interpretation from similar session
Spotify rate limited → Exponential backoff, queue local actions
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Synchronous API Chains

**What:** Awaiting each API call sequentially when they could run in parallel

**Why Bad:** User waits 5s (Claude) + 2s (Spotify) = 7s instead of max(5, 2) = 5s

**Example (BAD):**
```typescript
const vibeAttrs = await claudeClient.interpretVibe(input);
const recommendations = await spotifyClient.getRecommendations(vibeAttrs);
const voice = await elevenLabsClient.generate(recommendations[0]);
```

**Instead:**
```typescript
const vibeAttrs = await claudeClient.interpretVibe(input);
const [recommendations, voice] = await Promise.all([
  spotifyClient.getRecommendations(vibeAttrs),
  elevenLabsClient.generate(previousTrackContext) // Pre-generate for next track
]);
```

---

### Anti-Pattern 2: Polling Without Visibility Check

**What:** Continuing to poll Spotify API when tab is hidden

**Why Bad:** Burns rate limit quota (180/min shared across all requests), drains battery

**Instead:**
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearInterval(pollingInterval);
    } else {
      pollingInterval = startPolling();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

---

### Anti-Pattern 3: Direct SQLite Access from Client

**What:** Using browser-based SQLite (sql.js) in Client Components

**Why Bad:** Exposes taste profile data to browser, can't use server-side optimizations

**Instead:** API routes as data access layer
```typescript
// app/api/taste-profile/route.ts
export async function GET() {
  const profile = await db.query('SELECT * FROM taste_profiles WHERE user_id = ?', [userId]);
  return Response.json(profile);
}

// Client Component
const profile = await fetch('/api/taste-profile').then(r => r.json());
```

---

### Anti-Pattern 4: Rebuilding Queue on Every Feedback

**What:** Clearing and regenerating entire queue when user says "more like this"

**Why Bad:** Disrupts upcoming tracks that were already good, causes jarring transitions

**Instead:** Partial queue updates
```typescript
// Keep next 2 tracks (smooth transition), replace rest
const keep = queue.slice(0, 2);
const newTracks = await generateWithRefinedVibe(feedback);
setQueue([...keep, ...newTracks]);
```

---

### Anti-Pattern 5: Hardcoded Vibe Mappings

**What:** Manually mapping phrases like "chill" → `{ energy: 0.3, valence: 0.5 }`

**Why Bad:** Doesn't understand context ("chill house" vs "chill jazz"), brittle, no learning

**Instead:** Claude interpretation with examples
```typescript
// Let Claude handle nuance
const systemPrompt = `
You interpret musical vibes into Spotify attributes.
Examples:
- "chill jazz" → { energy: 0.3, genres: ['jazz'], instrumentalness: 0.7 }
- "chill house" → { energy: 0.5, genres: ['house'], valence: 0.6 }
`;
```

## Scalability Considerations

| Concern | At 1 User (MVP) | At 10 Users | At 100+ Users |
|---------|-----------------|-------------|---------------|
| **Spotify Rate Limits** | No issue (180/min) | No issue (18/min per user) | Need request queuing, per-user tracking |
| **SQLite Concurrency** | No issue (single user) | SQLite supports <100 concurrent reads | Migrate to PostgreSQL/MySQL |
| **Voice Generation** | No issue (pre-generate) | Cache frequently requested voices | CDN for voice clips, share across users |
| **Claude API Costs** | ~$0.01/session (Sonnet) | ~$0.10/day | Batch requests, cache common vibes |
| **State Management** | React Context sufficient | Still sufficient | Consider Zustand/Redux for complex state |
| **Hosting** | Vercel free tier OK | Vercel hobby tier ($20/mo) | Vercel Pro or self-hosted |

**For Vibe DJ (personal tool):** Optimize for 1 user, ignore multi-user concerns for MVP.

## Technology-Specific Decisions

### Next.js 14+ App Router

**Server Components for:**
- Initial page load (fetch taste profile, session history)
- API routes (Spotify/Claude/ElevenLabs proxies, DB access)

**Client Components for:**
- All interactive UI (chat, playback controls, queue management)
- Polling orchestrator (needs `useEffect`)
- State management (React Context)

**Route Structure:**
```
app/
  layout.tsx              # Root layout (dark theme)
  page.tsx                # Main app (Server Component wrapper)
  components/
    now-playing.tsx       # Client Component
    chat-interface.tsx    # Client Component
    queue-manager.tsx     # Client Component
  api/
    spotify/
      auth/callback/route.ts
      player/route.ts
      recommendations/route.ts
    claude/route.ts
    elevenlabs/route.ts
    taste-profile/route.ts
```

**Critical:** Use `'use client'` directive only where needed (interactive components), maximize Server Component usage for better performance.

---

### Spotify Web API

**Key Endpoints:**

| Endpoint | Method | Purpose | Notes |
|----------|--------|---------|-------|
| `/me/player` | GET | Current playback state | Poll every 3s |
| `/me/player/play` | PUT | Start/resume playback | Requires device_id |
| `/me/player/pause` | PUT | Pause playback | — |
| `/me/player/next` | POST | Skip to next track | — |
| `/me/player/queue` | POST | Add track to queue | Preferred over playlist manipulation |
| `/recommendations` | GET | Get track recommendations | Max 5 seeds (artists + genres + tracks) |
| `/search` | GET | Search tracks/artists | For "more like this" track lookup |
| `/me/tracks` | PUT | Save track to Liked Songs | — |
| `/playlists/{id}/tracks` | POST | Add tracks to playlist | For session playlist creation |

**Authentication Flow:**
1. User clicks "Connect Spotify" → Redirect to Spotify OAuth
2. Spotify redirects to `/api/spotify/auth/callback` with code
3. Exchange code for access + refresh tokens (PKCE flow)
4. Store tokens in httpOnly cookie (secure, not localStorage)
5. Refresh token before expiry (background process)

**Device Selection:**
```typescript
// Get available devices
const devices = await fetch('/api/spotify/devices').then(r => r.json());

// Find Sonos device
const sonos = devices.find(d => d.name.includes('Sonos') || d.type === 'Speaker');

// Transfer playback
await fetch('/api/spotify/player', {
  method: 'PUT',
  body: JSON.stringify({ device_ids: [sonos.id], play: false })
});
```

---

### Claude API

**Structured Output Example:**

```typescript
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: `Interpret this musical vibe: "${userInput}"

      Return JSON with this structure:
      {
        "genres": ["string"], // Spotify genre IDs
        "energy": number,     // 0-1
        "valence": number,    // 0-1 (happiness)
        "tempo": number,      // BPM
        "instrumentalness": number, // 0-1
        "reasoning": "string" // Why these attributes
      }`
    }
  ]
});

const vibeAttrs = JSON.parse(response.content[0].text);
```

**Context Management:**
```typescript
// Session history format
const messages = [
  { role: 'user', content: 'Play cooking hard bop' },
  { role: 'assistant', content: '{"genres": ["hard-bop"], ...}' },
  { role: 'user', content: 'Too mellow, more energy' },
  // ... (keep last 10)
];
```

---

### ElevenLabs API

**Voice Generation:**

```typescript
const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/{voice_id}', {
  method: 'POST',
  headers: {
    'xi-api-key': process.env.ELEVENLABS_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: voiceScript,
    model_id: 'eleven_monolingual_v1',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  })
});

const audioBlob = await response.blob();
```

**Caching Strategy:**
```typescript
// In-memory cache for session
const voiceCache = new Map<string, Blob>();

// Generate and cache
const blob = await generateVoice(script);
voiceCache.set(trackId, blob);

// Play cached
const audio = new Audio(URL.createObjectURL(voiceCache.get(trackId)));
audio.play();
```

---

### SQLite (via better-sqlite3)

**Setup:**
```typescript
// lib/db.ts
import Database from 'better-sqlite3';

const db = new Database('./data/vibe-dj.db');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS taste_profiles (
    id INTEGER PRIMARY KEY,
    user_id TEXT NOT NULL,
    preferred_genres TEXT,
    anti_drift_rules TEXT,
    liked_artists TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    vibe_description TEXT,
    spotify_playlist_id TEXT
  );

  CREATE TABLE IF NOT EXISTS session_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    spotify_track_id TEXT,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_liked BOOLEAN DEFAULT 0,
    skipped BOOLEAN DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );
`);

export default db;
```

**API Route Access:**
```typescript
// app/api/taste-profile/route.ts
import db from '@/lib/db';

export async function GET() {
  const profile = db.prepare('SELECT * FROM taste_profiles WHERE user_id = ?').get('default');
  return Response.json(profile || {});
}

export async function POST(request: Request) {
  const data = await request.json();
  db.prepare(`
    INSERT OR REPLACE INTO taste_profiles (user_id, preferred_genres, anti_drift_rules, liked_artists, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
  `).run('default', JSON.stringify(data.genres), JSON.stringify(data.rules), JSON.stringify(data.artists));

  return Response.json({ success: true });
}
```

## Suggested Build Order

### Phase 1: Foundation (Week 1-2)
**Goal:** Authenticate with Spotify, display current playback, control playback

**Components to Build:**
1. Next.js project setup with App Router
2. Spotify OAuth implementation (PKCE flow)
3. Spotify API client (auth + player endpoints)
4. Playback State store (React Context)
5. Polling orchestrator (3s interval)
6. Now Playing display (read-only)
7. Basic playback controls (play/pause/skip)

**Success Criteria:**
- User can authenticate with Spotify
- UI shows current playing track (if Spotify already playing)
- Controls work (play/pause/skip update Spotify)
- Polling syncs state every 3s

**No Intelligence Yet:** This phase is pure Spotify integration foundation.

---

### Phase 2: Intelligence Layer (Week 3-4)
**Goal:** User describes vibe → tracks play on Sonos

**Components to Build:**
1. Claude API client
2. Vibe Interpreter (natural language → musical attributes)
3. Recommendation Engine (attributes → Spotify tracks)
4. Queue State store
5. Chat Interface UI
6. Queue Manager UI (display upcoming tracks)

**Success Criteria:**
- User types "cooking hard bop, no ballads" in chat
- Claude interprets to `{ genres: ['hard-bop'], energy: 0.7, ... }`
- Spotify Recommendations API returns tracks
- Tracks added to queue, play on Sonos
- Queue displays upcoming 5 tracks

**Dependencies:** Phase 1 (needs Spotify API client and playback state)

---

### Phase 3: Refinement & Memory (Week 5-6)
**Goal:** System learns from feedback, persists taste across sessions

**Components to Build:**
1. Refinement Engine (feedback → adjusted attributes)
2. SQLite schema setup
3. Taste Profile Store (persistent)
4. Session Store (persistent)
5. API routes for DB access
6. Feedback UI in chat ("too mellow" quick actions)
7. Session playlist auto-creation

**Success Criteria:**
- User says "too mellow" → queue adjusts to higher energy
- User closes app, reopens → taste profile persists
- Session complete → playlist auto-saved to Spotify

**Dependencies:** Phase 2 (needs recommendation engine to refine)

---

### Phase 4: Voice Personality (Week 7-8, parallel with Phase 3)
**Goal:** AI voice DJ introduces tracks naturally

**Components to Build:**
1. ElevenLabs API client
2. Voice Synthesis Orchestrator (anticipatory generation)
3. Voice cache (in-memory Map)
4. Voice DJ Controls UI (enable/disable)
5. Audio playback integration (play clip before track)

**Success Criteria:**
- Track changes → voice intro plays automatically
- No user-visible latency (pre-generated)
- User can disable voice DJ

**Dependencies:** Phase 1 (needs playback state to trigger generation), can build in parallel with Phase 2/3

---

### Phase 5: Polish & Discovery (Week 9-10)
**Goal:** Enhanced discovery, playlist management, visual polish

**Components to Build:**
1. Discovery Engine (lesser-known artists)
2. Playlist Manager UI (view/edit session playlists)
3. History View (scrollable played tracks)
4. Dynamic accent color extraction (from album art)
5. Anti-drift logic refinement
6. Like/save functionality UI

**Success Criteria:**
- Queue includes 20% lesser-known artists matching vibe
- User can view all session playlists
- History scrolls smoothly with album art
- UI accent colors match album art

**Dependencies:** Phase 3 (needs session history, taste profile)

---

### Critical Path Summary

```
Week 1-2: Foundation (Spotify integration)
  ↓
Week 3-4: Intelligence (AI curation)
  ↓
Week 5-6: Refinement (learning & memory)
  ↓
Week 9-10: Polish (discovery & visual)

Week 7-8: Voice (parallel, depends on Foundation only)
```

**Estimated Total:** 8-10 weeks for full feature set, but **core value delivered by Week 4** (end of Phase 2).

## Open Questions & Research Flags

### Questions Requiring Phase-Specific Research

1. **Spotify Queue Behavior:** Does `add-to-queue` maintain order if multiple tracks added rapidly? Need to test edge cases.
   - **When to research:** Phase 2 (Intelligence Layer)
   - **How to validate:** Add 10 tracks in <1s, verify playback order

2. **ElevenLabs Generation Speed:** Is 1-3s latency consistent, or does it spike? What's the 95th percentile?
   - **When to research:** Phase 4 (Voice Personality)
   - **How to validate:** Generate 100 samples, measure p50/p95/p99

3. **Claude Context Window Optimization:** Does 10-message window maintain coherent refinement, or do we need full session history?
   - **When to research:** Phase 3 (Refinement)
   - **How to validate:** A/B test refinement quality with 5/10/20 message windows

4. **Spotify Connect Device Discovery:** How reliable is device name matching ("Sonos")? Do all Sonos speakers report the same type?
   - **When to research:** Phase 1 (Foundation)
   - **How to validate:** Test with multiple Sonos devices, check type field

5. **Anti-Drift Rule Enforcement:** Should anti-drift rules be hard filters (exclude entirely) or soft penalties (downrank)?
   - **When to research:** Phase 3 (Refinement)
   - **How to validate:** User testing with "no smooth jazz" rule, measure false negatives

### Confidence Gaps

| Area | Current Confidence | Verification Needed |
|------|-------------------|---------------------|
| Spotify Queue API behavior | MEDIUM | Test rapid adds, device switching |
| ElevenLabs latency consistency | MEDIUM | Benchmark 95th percentile |
| Next.js App Router with polling | HIGH | Standard pattern, well-documented |
| Claude JSON output reliability | HIGH | Structured output mode is deterministic |
| SQLite for single-user app | HIGH | Proven pattern for local-first apps |
| Spotify Connect device selection | LOW | Need to test Sonos-specific behavior |

**Recommendation:** Flag Spotify Connect device selection for deeper research in Phase 1. If device discovery is unreliable, may need manual device picker UI.

## Sources & Confidence Assessment

**Source Hierarchy Used:**
1. Training data (Spotify Web API, Next.js patterns, Claude API)
2. Project context (PROJECT.md requirements)
3. Industry patterns (AI music curation, real-time sync)

**Overall Confidence:** MEDIUM

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Spotify API integration | HIGH | Well-documented API, standard OAuth patterns |
| Next.js architecture | HIGH | App Router patterns are established best practices |
| Claude API usage | HIGH | Structured output is reliable for JSON parsing |
| ElevenLabs integration | MEDIUM | Training data limited, latency assumptions need verification |
| SQLite schema | HIGH | Standard relational schema for music metadata |
| Component boundaries | HIGH | Clear separation of concerns, proven in similar apps |
| Build order | HIGH | Logical dependency graph, matches MVP → polish progression |
| Data flow | HIGH | Unidirectional flow aligns with React best practices |
| Voice generation patterns | MEDIUM | Anticipatory generation is sound, but cache strategy needs tuning |
| Anti-drift logic | MEDIUM | Conceptually sound, but filtering strategy needs validation |

**Limitations:**
- External verification tools were unavailable (WebSearch, WebFetch, Bash restricted)
- Relied on training data from 2024-2025, may not reflect latest API changes
- Spotify Connect device behavior assumptions need real-world testing
- ElevenLabs latency estimates based on typical API performance, not benchmarked

**Recommendations for Validation:**
1. **Phase 1:** Test Spotify Connect device selection thoroughly (may need device picker UI)
2. **Phase 2:** Benchmark Claude vibe interpretation quality with real user inputs
3. **Phase 4:** Measure ElevenLabs p95 latency, adjust pre-generation window if needed
4. **Phase 3:** A/B test anti-drift filtering (hard vs soft) with user feedback

---

**Next Steps for Orchestrator:**
- Use this architecture to inform roadmap phase structure
- Prioritize Foundation → Intelligence → Refinement (critical path)
- Flag Spotify Connect device selection for Phase 1 research
- Consider voice personality as parallel track (not blocking core value)
