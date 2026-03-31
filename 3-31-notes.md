# Vibe DJ - Status as of 2026-03-31 (End of Session)

## The Reality Check

The roadmap shows 10/10 phases "complete" but **the app doesn't work**. All those phases were built on a foundation with critical bugs that were never caught. Today we tried to fix those bugs and burned hours on OAuth and rate limiting issues.

## Current Blocker: Spotify Rate Limited

We are currently **locked out of Spotify's Player API** due to rate limiting. This happened because:

1. **OAuth redirect bug** - `app/api/auth/callback/spotify/route.ts` line 13 used `NEXT_PUBLIC_APP_URL` (production URL) instead of the request origin. This caused auth failures when testing locally with `127.0.0.1`.

2. **Cascade of page refreshes** - While debugging OAuth, we refreshed dozens of times. Each refresh started the polling hook.

3. **Aggressive polling + bad error handling** - Polling ran every 5 seconds. When it got 429 errors, the error handler retried after only 2 seconds. This made the rate limit worse with every attempt.

4. **No circuit breaker** - There was nothing to stop the cascade. The app just kept hammering Spotify until we were completely locked out.

**To unblock:** Wait 15-30 minutes for rate limit to clear, then test with:
```javascript
const tokens = JSON.parse(localStorage.getItem('vibe-dj-spotify-auth'));
fetch('https://api.spotify.com/v1/me/player', {
  headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
}).then(r => console.log('Status:', r.status));
```

If status is 200, the app should work. If still 429, wait longer or create a new Spotify app.

## Bugs Fixed This Session

1. **OAuth redirect** - Now uses `request.headers.get("host")` to preserve `127.0.0.1` vs `localhost` distinction
2. **No retry on 429** - Rate limit errors now fail immediately instead of retrying
3. **60s default backoff** - Was 2s, now 60s
4. **Slower polling** - 10s when playing, 30s when paused (was 5s/15s)
5. **Circuit breaker** - After 3 consecutive failures, polling stops completely with "Try again" button
6. **Stale closure bug** - Polling hook used refs properly to avoid capturing stale state

## Bugs Identified But Not Yet Verified

These fixes were made in the previous session but we couldn't test them because of rate limiting:
- Stale token handling (tokens past expiry should refresh, not try to use)
- Device reconnection (saved device going offline should trigger re-fetch)
- Curation search batching (5 parallel searches could trigger 429s)

## What Actually Needs to Happen

### Phase 0: Stability (MUST COMPLETE FIRST)
1. Wait for rate limit to clear
2. Verify OAuth flow works end-to-end (127.0.0.1 → Spotify → back → authenticated)
3. Verify polling works without triggering rate limits
4. Verify curation flow works (type vibe → get tracks → hear music)

### Then: The Real Work
The app has all the features built but they've never been properly tested together. Once stability is confirmed:
1. Test Claude curator end-to-end with real vibes
2. Test skip/dislike/taste profile flow
3. Test session persistence
4. Test voice DJ

## Files Changed This Session

- `app/api/auth/callback/spotify/route.ts` - OAuth redirect fix
- `lib/spotify/errors.ts` - No retry on 429, better logging
- `lib/hooks/use-playback-polling.ts` - Circuit breaker, slower intervals, better backoff
- `lib/stores/playback-store.ts` - Added `rateLimitRemaining` state
- `lib/stores/auth-store.ts` - Removed debug alert
- `components/player/now-playing-hero.tsx` - Better error states with retry button

## The Uncomfortable Truth

The roadmap shows 10/10 phases "complete" but **none of it was tested as a working system**. Code was written, commits were made, phases were checked off - but nobody ever sat down and used the app end-to-end. The foundation had critical bugs (OAuth redirect, aggressive polling, no error recovery) that meant the app never actually worked reliably.

Today we tried to fix those bugs and immediately hit a rate limit lockout because the error handling made things worse, not better. We burned an entire session on stability issues that should have been caught in Phase 1.

**The roadmap lied.** "Complete" meant "code exists," not "feature works."

## Lesson Learned

Before any new features:

1. **Test the happy path manually** - Can a human use it?
2. **Test error recovery** - What happens when things fail?
3. **Watch the network tab** - Are we making reasonable requests?

## Next Session Checklist

1. [ ] Test Spotify API access (run the fetch test above)
2. [ ] If 200: test full auth flow
3. [ ] If 200: test polling (should see tracks, no errors)
4. [ ] If 200: test curation (type "chill jazz", verify tracks play)
5. [ ] If still 429: create new Spotify app in Developer Dashboard
