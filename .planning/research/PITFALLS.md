# Domain Pitfalls: AI Music Curation with Spotify Integration

**Domain:** AI-powered music curator with Spotify API
**Researched:** 2026-03-30
**Confidence:** MEDIUM (based on training data, not verified with current docs)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Token Refresh Race Conditions
**What goes wrong:** Spotify access tokens expire after 1 hour. Multiple concurrent requests can trigger simultaneous refresh attempts, causing token invalidation or 401 errors that cascade across the app.

**Why it happens:**
- No centralized token manager
- Each API call independently checks token expiration
- React components making parallel requests during initial load

**Consequences:**
- Playback stops mid-session
- UI shows authentication errors when user is legitimately logged in
- User forced to re-authenticate unnecessarily
- Race conditions create intermittent bugs that are hard to reproduce

**Prevention:**
- Implement a singleton token manager that queues requests during refresh
- Proactively refresh tokens at 50 minutes (before expiration)
- Use a mutex/lock pattern to prevent concurrent refresh attempts
- Store tokens in a single source of truth (not duplicated across components)

**Detection:**
- Seeing 401 errors despite valid refresh token
- Users reporting "randomly logged out" during active sessions
- Multiple token refresh requests in network logs within seconds

**Phase mapping:** Address in Phase 1 (Spotify integration foundation) — this is architectural, not a later fix.

---

### Pitfall 2: Spotify Recommendations API "Filter Bubble Collapse"
**What goes wrong:** The Spotify Recommendations API tends to converge on a narrow subset of artists after multiple calls, even when using different seed tracks. Users get stuck in a repetitive loop that doesn't match their actual taste breadth.

**Why it happens:**
- Recommendations API optimizes for "safe" choices (popular tracks within seed genres)
- Using the same seed tracks or similar audio features creates feedback loops
- API has limited randomness controls
- Over-reliance on `valence`, `energy` parameters without genre/artist diversity

**Consequences:**
- "Too mellow" corrections lead to all uptempo tracks from 3 artists
- Jazz requests collapse into Kenny G and smooth jazz despite user preferences
- User loses trust in curation quality after 4-5 tracks
- Anti-drift logic becomes a cat-and-mouse game with the API

**Prevention:**
- Rotate seed tracks aggressively (never use same seed twice in a session)
- Blend multiple recommendation calls with different seed types (tracks, artists, genres)
- Inject manual diversity: periodically seed from user's top artists or recent listening
- Use `market` parameter to access regional variations
- Implement a "seen artists" filter to force variety
- Combine Recommendations API with Search API for targeted genre exploration

**Detection:**
- Same artists appearing 3+ times in a 20-track queue
- User feedback: "too similar," "all sounds the same"
- Narrow tempo/energy ranges despite varied requests

**Phase mapping:** Address in Phase 2 (AI curation logic) — requires experimentation with seed strategies.

---

### Pitfall 3: LLM Hallucinating Music Metadata
**What goes wrong:** When using LLMs to interpret "give me cooking jazz with hard bop energy," they confidently return artist names, track titles, or audio feature values that don't exist or don't match the actual music on Spotify.

**Why it happens:**
- LLMs generate plausible-sounding music knowledge from training data
- No validation that suggested artists/tracks exist in Spotify catalog
- LLM suggests "classic hard bop" artists who died before streaming era (limited catalog)
- Audio feature mappings (`valence=0.7, energy=0.8`) are invented, not derived from actual Spotify data

**Consequences:**
- Search API returns zero results for "hallucinated" track names
- Recommendations based on fictional audio features miss the vibe
- User requests "more like Clifford Brown" but LLM seeds with wrong era/genre
- Trust erodes: "the AI doesn't know jazz"

**Prevention:**
- **Never let LLM directly query Spotify** — use structured output to extract intent only
- LLM outputs: `{ mood: "energetic", genre_seeds: ["hard-bop", "jazz"], audio_features: {...}, avoid_descriptors: ["smooth", "ballad"] }`
- Application layer validates genre seeds against Spotify's available seed genres
- Use LLM for **intent parsing**, not music expertise
- Validate all artist/track suggestions via Spotify Search API before using as seeds
- Consider two-step: LLM interprets → app searches Spotify → LLM refines based on actual results

**Detection:**
- Spotify API returning 404s for tracks LLM suggested
- Search queries returning zero results
- Recommended playlists that don't match user's verbal description

**Phase mapping:** Address in Phase 2 (AI curation logic) — core to prompt engineering strategy.

---

### Pitfall 4: Spotify Connect State Desync
**What goes wrong:** Spotify Connect allows multiple devices to control the same playback session, but state updates aren't real-time. Your app shows "playing" while the user paused from their phone, or displays the wrong track.

**Why it happens:**
- Spotify doesn't provide webhooks for player state changes
- Polling `/me/player` every 3-5 seconds has inherent lag
- User interactions on other devices (phone, desktop, Alexa) aren't instantly reflected
- Multiple apps polling simultaneously can get stale cache responses

**Consequences:**
- UI shows "Now Playing: Track A" but Sonos is playing Track B
- User hits "next" in your app, but nothing happens (another device already advanced)
- Playback controls become unresponsive or delayed
- User abandons app for native Spotify interface (defeats purpose)

**Prevention:**
- Poll aggressively during active playback (2-3 seconds), back off when idle (10-15 seconds)
- Implement optimistic UI updates: immediately reflect user actions, rollback if polling shows conflict
- Show visual indicator when state is "stale" (last poll > 5 seconds ago)
- Cache `is_playing` and `progress_ms` separately — update progress locally between polls
- Use `currently_playing_type` to detect if user switched to podcast/audiobook
- Handle 204 No Content responses gracefully (no active device)

**Detection:**
- UI flickers between different track states
- User reports "lag" when clicking play/pause
- Progress bar jumps backward on poll updates

**Phase mapping:** Address in Phase 1 (Spotify integration) — polling strategy is foundational.

---

### Pitfall 5: Queue Manipulation Limits
**What goes wrong:** Spotify's queue API has severe limitations: you can't read the current queue, can't reorder, can't remove items, and queued tracks disappear after playback. This makes "live queue display with remove/reorder" requirements nearly impossible.

**Why it happens:**
- Spotify Web API's `/me/player/queue` endpoint is POST-only (add to queue)
- No GET endpoint to retrieve queue contents
- No DELETE endpoint to remove queue items
- Queue is opaque — you can add to it but can't inspect it

**Consequences:**
- Your app's "queue display" is a client-side simulation, not actual Spotify queue
- User reorders tracks in your UI, but Spotify plays original order
- User removes a track, it still plays because Spotify queue wasn't modified
- Desync between your UI queue and actual playback queue causes confusion

**Prevention:**
- **Don't use Spotify's queue API for user-facing queue management**
- Instead: manage queue as a playlist
  - Create a session playlist on app start
  - Add/remove/reorder tracks in the playlist
  - Use `play` endpoint with `context_uri` to play from playlist position
- Or: use `play` endpoint with `uris` array (max 800 tracks) for ephemeral queue
- Clearly document in UI: "Queue is managed by this app, not shared with Spotify native clients"
- Accept tradeoff: queue only visible in your app, not in Spotify mobile UI

**Detection:**
- User reports queue doesn't match what's playing
- "Remove from queue" button doesn't work
- Queue order resets after pausing/resuming

**Phase mapping:** Address in Phase 1 (Spotify integration) — architectural decision on queue strategy.

---

## Moderate Pitfalls

### Pitfall 6: Over-Polling During Inactive Playback
**What goes wrong:** App continues polling `/me/player` every 3 seconds even when nothing is playing, wasting API quota and battery.

**Prevention:**
- Implement exponential backoff: 3s when playing → 10s when paused → 30s when idle
- Stop polling entirely when tab is backgrounded (use Page Visibility API)
- Resume aggressive polling on user interaction (button click, chat input)

**Phase mapping:** Optimize in Phase 3 (polish) — not critical for MVP.

---

### Pitfall 7: Ignoring Spotify's Explicit Content Filters
**What goes wrong:** User has explicit content filtering enabled in Spotify settings, but your app seeds recommendations without respecting this, causing filtered tracks to appear.

**Prevention:**
- Check `product` and `explicit_content` settings from `/me` endpoint
- Pass `market` parameter to all recommendation/search calls
- Filter out `explicit: true` tracks if user has filtering enabled
- Show why a track was skipped ("explicit content filtered")

**Phase mapping:** Address in Phase 2 (AI curation) — part of recommendation logic.

---

### Pitfall 8: ElevenLabs Voice Latency Causing Dead Air
**What goes wrong:** Generating voice commentary takes 1-3 seconds. If triggered when track starts, there's awkward silence while waiting for audio.

**Prevention:**
- Pre-generate voice clips during previous track's final 30 seconds
- Cache generated clips (same track intro can reuse audio)
- Provide fallback: show text commentary while audio loads
- Allow users to disable voice DJ if latency is annoying

**Phase mapping:** Address in Phase 4 (Voice DJ feature) — feature-specific optimization.

---

### Pitfall 9: SQLite Concurrency Issues in Vercel Serverless
**What goes wrong:** Vercel serverless functions are ephemeral and stateless. SQLite requires file system persistence, which isn't guaranteed across function invocations.

**Prevention:**
- If deploying to Vercel, use Turso (SQLite-compatible, edge-hosted) instead of local SQLite
- Or: use Vercel KV (Redis) for session state, Postgres for persistent data
- Or: self-host on Mac Mini as spec allows (SQLite works fine in persistent environments)
- Don't assume filesystem writes persist across serverless invocations

**Phase mapping:** Address in Phase 1 (architecture setup) — deployment target affects DB choice.

---

### Pitfall 10: "Anti-Drift" Logic Creating Overfitting
**What goes wrong:** User says "no smooth jazz" so app aggressively filters out anything with `valence > 0.5`, inadvertently removing upbeat hard bop tracks.

**Prevention:**
- Store anti-drift rules as exclusions, not hard filters: "avoid artists X, Y" not "valence < 0.5"
- Use genre-level exclusions ("smooth-jazz" seed) rather than audio feature constraints
- Allow LLM to interpret "smooth jazz" contextually (slow + mellow + soft instruments)
- Let user override: "actually, that track was good" removes it from exclusion list

**Phase mapping:** Address in Phase 2 (AI curation) — requires nuanced prompt engineering.

---

## Minor Pitfalls

### Pitfall 11: Album Art CORS Issues
**What goes wrong:** Spotify returns `images` array with URLs that may have CORS restrictions, causing canvas drawing or image processing to fail.

**Prevention:**
- Use `<img>` tags with `crossorigin="anonymous"` attribute
- Proxy images through your API route if CORS blocks canvas access (for color extraction)
- Fallback to default gradient if image fails to load

**Phase mapping:** Address in Phase 3 (UI polish) — visual enhancement, not core functionality.

---

### Pitfall 12: Not Handling "No Active Device" State
**What goes wrong:** User opens app but hasn't started Spotify anywhere. API returns 204 No Content, app shows blank screen.

**Prevention:**
- Detect 204 response from `/me/player`
- Show helpful message: "Start playback on a device (Sonos, phone, etc.) to continue"
- Offer "available devices" list from `/me/player/devices` endpoint
- Allow user to select Sonos as target device and start playback via app

**Phase mapping:** Address in Phase 1 (Spotify integration) — critical UX for first launch.

---

### Pitfall 13: Framer Motion Layout Thrashing
**What goes wrong:** Animating "Now Playing" card with layout animations causes reflows on every poll update, creating jank.

**Prevention:**
- Use `layoutId` sparingly — only for major transitions (track changes), not progress updates
- Animate `transform` and `opacity` (GPU-accelerated), not `width`/`height`
- Update progress bar with CSS transforms, not re-renders
- Debounce album art color extraction (don't recalculate on every render)

**Phase mapping:** Optimize in Phase 3 (UI polish) — performance tuning after features work.

---

### Pitfall 14: Taste Profile Overfitting to Recent Sessions
**What goes wrong:** User plays 3 jazz sessions, then wants to try electronic music, but taste profile is now locked into jazz.

**Prevention:**
- Weight taste profile by time decay (recent = lower influence than long-term patterns)
- Separate "session context" from "long-term taste profile"
- Allow user to explicitly switch modes: "Explore mode" (ignore profile) vs "Personalized mode"
- Track genre diversity in profile, not just preferences

**Phase mapping:** Address in Phase 5 (Taste profile) — feature extension, not MVP.

---

### Pitfall 15: Chat History Growing Unbounded
**What goes wrong:** Session memory keeps entire conversation context, causing LLM API costs to spike and response latency to increase.

**Prevention:**
- Limit context window to last 10 messages or 2000 tokens
- Summarize older context: "User prefers energetic jazz, dislikes ballads" instead of full chat log
- Store refinements as structured data (liked tracks, skipped tracks) rather than natural language

**Phase mapping:** Optimize in Phase 2 (AI curation) — cost management as feature matures.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Spotify Auth (Phase 1) | Token refresh race conditions | Singleton token manager, proactive refresh |
| Spotify Playback (Phase 1) | Queue API limitations | Use playlist-based queue or `uris` array |
| Spotify Playback (Phase 1) | Connect state desync | Aggressive polling + optimistic UI |
| AI Curation (Phase 2) | LLM hallucinating metadata | Structured output, validate against Spotify |
| AI Curation (Phase 2) | Recommendations filter bubble | Rotate seeds, blend multiple calls, diversity filters |
| AI Refinement (Phase 2) | Anti-drift overfitting | Store exclusions, not hard filters |
| Voice DJ (Phase 4) | ElevenLabs latency | Pre-generate during previous track |
| Taste Profile (Phase 5) | Overfitting to recent sessions | Time-weighted, separate session vs long-term |
| Deployment (Phase 1) | SQLite on Vercel serverless | Use Turso or self-host |

---

## Verification Notes

**Confidence Assessment:**
- **Spotify API pitfalls:** MEDIUM confidence
  - Based on training data (pre-2025), not verified against current Spotify docs
  - Core API patterns (token refresh, polling, queue limitations) are stable but should verify rate limits and new endpoints

- **AI/LLM integration pitfalls:** HIGH confidence
  - General LLM hallucination patterns are well-established
  - Specific to music domain based on training data

- **Architecture pitfalls:** MEDIUM confidence
  - Next.js, Vercel, SQLite patterns are current as of training cutoff
  - Framer Motion performance guidance based on general React best practices

**Gaps to Address:**
- Current Spotify API rate limits (claimed 180 req/min in PROJECT.md, should verify)
- New Spotify API endpoints added after 2025-01
- ElevenLabs API latency characteristics (1-3s estimate should be measured)
- Sonos + Spotify Connect interaction specifics

**Sources (Training Data, Not Verified):**
- Spotify Web API documentation (pre-2025)
- Common Spotify integration patterns from developer discussions
- LLM hallucination research and mitigation strategies
- React/Next.js performance best practices

**Recommended Next Steps:**
1. Verify Spotify API documentation for current rate limits, queue endpoints, Connect behavior
2. Test token refresh edge cases in development before deployment
3. Prototype recommendation seed strategies early to validate anti-filter-bubble approach
4. Measure actual ElevenLabs latency in target environment

---

## Summary

**Critical takeaways for roadmap:**

1. **Phase 1 must solve:** Token management, queue strategy, polling architecture (technical debt here requires rewrites)
2. **Phase 2 requires experimentation:** Recommendation seed rotation, LLM structured output (budget time for iteration)
3. **Known unknowns:** Spotify Connect state sync behavior, recommendation API convergence patterns (plan for research spikes)
4. **Late-phase optimizations:** Voice latency, taste profile tuning, animation performance (defer to polish phases)

**Confidence level: MEDIUM** — Core architectural pitfalls are well-known, but specific API behaviors need verification against current Spotify documentation.
