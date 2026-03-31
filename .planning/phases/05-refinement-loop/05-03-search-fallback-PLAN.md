---
phase: 5
plan: 3
title: Search Fallback
wave: 2
depends_on: [05-01-refinement-interpreter]
files_modified:
  - lib/hooks/use-vibe-curation.ts
  - lib/spotify/search.ts
requirements_addressed: [CURA-05]
autonomous: true
---

<objective>
Add search fallback when natural language interpretation fails to find tracks.

Purpose: When Claude can't interpret a vibe or Spotify returns no recommendations, fall back to direct search.
Output: Graceful degradation that still plays music.
</objective>

<must_haves>
- Detect when recommendations return 0 tracks
- Fall back to Spotify search using original query
- Show user-friendly message about fallback
- Still track played songs in session
</must_haves>

<task id="1">
<title>Add Search-Based Recommendation Fallback</title>
<read_first>
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/hooks/use-vibe-curation.ts
- /Users/dylandibona/dylan@dylandibona.com/_Code Projects/Vibe DJ/lib/spotify/search.ts
</read_first>
<action>
Update lib/hooks/use-vibe-curation.ts to add search fallback:

1. Import searchTracks from lib/spotify
2. After recommendations return 0 tracks, try search fallback
3. Use extracted terms from interpretation or original query
4. Generate appropriate response message

Add this logic in processVibe after the recommendations check:

```typescript
// After the recommendations call, replace the empty tracks check:

let tracks = recommendedTracks;
let usedFallback = false;

// If no recommendations, try search fallback
if (tracks.length === 0) {
  // Try searching with genre + mood terms
  const searchTerms = [
    ...interpretation.genres.slice(0, 2),
    interpretation.energy > 0.7 ? "energetic" : interpretation.energy < 0.3 ? "calm" : "",
  ].filter(Boolean).join(" ");

  const searchResults = await searchTracks(searchTerms || userMessage, 10);

  if (searchResults.length === 0) {
    throw new Error(
      "No tracks found matching that vibe. Try being more specific or different genres."
    );
  }

  tracks = searchResults;
  usedFallback = true;
}

// Update the response message generation:
const genres = interpretation.genres.slice(0, 3).join(", ");
const trackPreview = tracks
  .slice(0, 3)
  .map((t: Track) => `"${t.name}" by ${t.artists[0]?.name}`)
  .join(", ");

let assistantMessage: string;
if (usedFallback) {
  assistantMessage =
    `I couldn't find perfect matches, but here's what I found: ${trackPreview}` +
    (tracks.length > 3 ? ` and ${tracks.length - 3} more tracks.` : ".");
} else {
  assistantMessage =
    `Got it! Setting the vibe with ${genres}. Starting with ${trackPreview}` +
    (tracks.length > 3 ? ` and ${tracks.length - 3} more tracks.` : ".");
}
```
</action>
<acceptance_criteria>
- Search fallback triggers when recommendations empty
- Uses genre + mood terms for search
- Distinct message for fallback results
- Still plays music and tracks session
</acceptance_criteria>
</task>

<task id="2">
<title>Handle Interpretation Failures</title>
<action>
Add interpretation failure fallback in processVibe:

```typescript
// After the interpretation API call, add fallback for failed interpretation:

let interpretation: VibeInterpretation;
let interpretationFailed = false;

if (!interpretResponse.ok) {
  // Interpretation failed - use default vibe and search directly
  interpretationFailed = true;
  interpretation = {
    genres: ["pop"],
    energy: 0.5,
    valence: 0.5,
    tempo: { min: 100, max: 140 },
    instrumentalness: 0.2,
    exclusions: { genres: [], artists: [] },
    seedArtists: [],
    seedTracks: [],
  };
} else {
  const data = await interpretResponse.json();
  interpretation = data.interpretation;
}

// Later, if interpretation failed, go straight to search:
if (interpretationFailed) {
  setState((s) => ({ ...s, currentStep: "recommending" }));
  const searchResults = await searchTracks(userMessage, 10);

  if (searchResults.length === 0) {
    throw new Error("Couldn't find any tracks. Try a different search.");
  }

  // Play search results
  setState((s) => ({ ...s, currentStep: "playing" }));
  const trackIds = searchResults.map((t) => t.id);
  await playTracks(trackIds);
  addPlayedTracks(trackIds);

  const trackPreview = searchResults
    .slice(0, 3)
    .map((t) => `"${t.name}" by ${t.artists[0]?.name}`)
    .join(", ");

  addMessage({
    role: "assistant",
    content: `Searching for "${userMessage}"... Found ${trackPreview}${searchResults.length > 3 ? ` and ${searchResults.length - 3} more.` : "."}`
  });

  setState({ isProcessing: false, currentStep: "idle", error: null });
  setLoading(false);
  return { success: true, tracks: searchResults };
}
```
</action>
<acceptance_criteria>
- Interpretation failures handled gracefully
- Direct search used as fallback
- User sees helpful message
- Playback still works
</acceptance_criteria>
</task>

<verification>
```bash
# TypeScript compiles
npx tsc --noEmit

# Build succeeds
npm run build
```
</verification>
