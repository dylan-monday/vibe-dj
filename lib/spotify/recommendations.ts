// Spotify Recommendations API wrapper
// Converts VibeInterpretation to tracks with seed rotation and diversity

import { getSpotifyClient } from "./client";
import { ensureValidToken } from "./auth";
import { SpotifyApiError, withErrorHandling } from "./errors";
import { Track } from "./types";
import { VibeInterpretation } from "@/lib/chat/types";
import { searchArtist } from "./search";

// Genre mapping: abstract terms → Spotify genre seeds
const GENRE_MAP: Record<string, string[]> = {
  // Jazz variants
  "hard bop": ["jazz", "bebop"],
  bebop: ["jazz", "bebop"],
  "cool jazz": ["jazz"],
  "free jazz": ["jazz"],
  "modal jazz": ["jazz"],
  "smooth jazz": ["jazz"],
  fusion: ["jazz", "funk"],

  // Electronic variants
  "lo-fi": ["electronic", "ambient"],
  lofi: ["electronic", "ambient"],
  ambient: ["ambient", "electronic"],
  synthwave: ["synth-pop", "electronic"],
  "nu-disco": ["disco", "electronic"],
  house: ["house", "electronic"],
  techno: ["techno", "electronic"],

  // Rock variants
  "post-punk": ["post-punk", "new-wave"],
  "indie rock": ["indie", "rock"],
  shoegaze: ["shoegaze", "indie"],
  grunge: ["grunge", "rock"],

  // Hip-hop variants
  "boom bap": ["hip-hop"],
  "lo-fi hip hop": ["hip-hop"],
  trap: ["hip-hop"],

  // Other
  "neo-soul": ["soul", "r-n-b"],
  funk: ["funk"],
  disco: ["disco"],
  classical: ["classical"],
  folk: ["folk"],
  country: ["country"],
  metal: ["metal"],
  punk: ["punk"],
  reggae: ["reggae"],
  blues: ["blues"],
};

// Map user genre to Spotify genre seed
function mapToSpotifyGenre(genre: string): string | null {
  const normalized = genre.toLowerCase().trim();

  // Direct match in map
  if (GENRE_MAP[normalized]) {
    return GENRE_MAP[normalized][0];
  }

  // Check if it's already a valid Spotify genre
  // Common Spotify genres that map directly
  const directGenres = [
    "pop",
    "rock",
    "jazz",
    "classical",
    "hip-hop",
    "r-n-b",
    "soul",
    "electronic",
    "dance",
    "indie",
    "alternative",
    "metal",
    "punk",
    "folk",
    "country",
    "blues",
    "reggae",
    "funk",
    "disco",
    "ambient",
    "house",
    "techno",
    "trance",
    "dubstep",
    "drum-and-bass",
  ];

  if (directGenres.includes(normalized)) {
    return normalized;
  }

  // Partial match
  for (const [key, values] of Object.entries(GENRE_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return values[0];
    }
  }

  return null;
}

// Session state for seed rotation
interface RecommendationSession {
  usedArtistSeeds: Set<string>;
  usedTrackSeeds: Set<string>;
  usedGenreSeeds: Set<string>;
}

// Create fresh session
export function createRecommendationSession(): RecommendationSession {
  return {
    usedArtistSeeds: new Set(),
    usedTrackSeeds: new Set(),
    usedGenreSeeds: new Set(),
  };
}

export interface RecommendationOptions {
  limit?: number; // 10-20 tracks
  session?: RecommendationSession;
  playedTrackIds?: string[]; // Exclude these from results
}

export interface RecommendationResult {
  tracks: Track[];
  seedsUsed: {
    artists: string[];
    tracks: string[];
    genres: string[];
  };
}

export async function getRecommendations(
  vibe: VibeInterpretation,
  options: RecommendationOptions = {}
): Promise<RecommendationResult> {
  await ensureValidToken();
  const client = getSpotifyClient();
  if (!client) {
    throw new SpotifyApiError("Not authenticated", 401);
  }

  const { limit = 20, session, playedTrackIds = [] } = options;
  const playedSet = new Set(playedTrackIds);

  // Build seed arrays (max 5 total seeds between artists, tracks, genres)
  const seedArtists: string[] = [];
  const seedTracks: string[] = [];
  const seedGenres: string[] = [];

  // 1. Try to resolve seed artists from interpretation
  if (vibe.seedArtists?.length) {
    for (const artistName of vibe.seedArtists.slice(0, 2)) {
      // Skip if already used this session
      if (session?.usedArtistSeeds.has(artistName.toLowerCase())) continue;

      const artist = await searchArtist(artistName);
      if (artist) {
        seedArtists.push(artist.id);
        session?.usedArtistSeeds.add(artistName.toLowerCase());
      }
    }
  }

  // 2. Map genres to Spotify genre seeds
  const mappedGenres: string[] = [];
  for (const genre of vibe.genres) {
    const mapped = mapToSpotifyGenre(genre);
    if (mapped && !session?.usedGenreSeeds.has(mapped)) {
      mappedGenres.push(mapped);
      session?.usedGenreSeeds.add(mapped);
    }
  }

  // Take up to (5 - seedArtists - seedTracks) genres
  const availableSlots = 5 - seedArtists.length - seedTracks.length;
  seedGenres.push(...mappedGenres.slice(0, Math.min(availableSlots, 3)));

  // If no seeds at all, use a default based on energy/valence
  if (
    seedArtists.length === 0 &&
    seedTracks.length === 0 &&
    seedGenres.length === 0
  ) {
    // Pick genre based on energy
    if (vibe.energy > 0.7) {
      seedGenres.push("electronic");
    } else if (vibe.energy < 0.3) {
      seedGenres.push("ambient");
    } else {
      seedGenres.push("indie");
    }
  }

  // Build recommendation parameters
  const params: Record<string, number | string | string[]> = {
    limit: Math.min(limit + 10, 50), // Request extra to filter
    target_energy: vibe.energy,
    target_valence: vibe.valence,
  };

  // Add tempo if specified
  if (vibe.tempo) {
    params.min_tempo = vibe.tempo.min;
    params.max_tempo = vibe.tempo.max;
  }

  // Add instrumentalness if specified
  if (vibe.instrumentalness !== undefined && vibe.instrumentalness !== null) {
    params.target_instrumentalness = vibe.instrumentalness;
  }

  return withErrorHandling(async () => {
    // Build request - only include non-empty seed arrays
    const requestParams: Record<string, unknown> = { ...params };
    if (seedArtists.length > 0) requestParams.seed_artists = seedArtists;
    if (seedTracks.length > 0) requestParams.seed_tracks = seedTracks;
    if (seedGenres.length > 0) requestParams.seed_genres = seedGenres;

    // Must have at least one seed
    if (!requestParams.seed_artists && !requestParams.seed_tracks && !requestParams.seed_genres) {
      requestParams.seed_genres = ["pop"]; // Fallback
    }

    const response = await client.recommendations.get(requestParams as Parameters<typeof client.recommendations.get>[0]);

    // Filter out played tracks and excluded artists
    const excludedArtistNames = new Set(
      vibe.exclusions.artists.map((a) => a.toLowerCase())
    );

    let tracks = response.tracks
      .filter((t) => !playedSet.has(t.id))
      .filter((t) => {
        // Check if any artist is excluded
        return !t.artists.some((a) =>
          excludedArtistNames.has(a.name.toLowerCase())
        );
      })
      .slice(0, limit)
      .map((t) => ({
        id: t.id,
        name: t.name,
        artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
        album: {
          id: t.album.id,
          name: t.album.name,
          images: t.album.images.map((img) => ({
            url: img.url,
            width: img.width ?? 0,
            height: img.height ?? 0,
          })),
        },
        durationMs: t.duration_ms,
      }));

    // Diversity check: ensure we don't have too many tracks from same artist
    const artistCounts = new Map<string, number>();
    tracks = tracks.filter((t) => {
      const artistId = t.artists[0]?.id;
      if (!artistId) return true;

      const count = artistCounts.get(artistId) || 0;
      if (count >= 3) return false; // Max 3 tracks per artist

      artistCounts.set(artistId, count + 1);
      return true;
    });

    return {
      tracks,
      seedsUsed: {
        artists: seedArtists,
        tracks: seedTracks,
        genres: seedGenres,
      },
    };
  });
}
