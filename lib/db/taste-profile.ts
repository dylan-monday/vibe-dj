// Taste profile database operations
// Manages persistent exclusions and preferences across sessions

import { db, excludedGenres, excludedArtists, likedArtists, genrePreferences } from "./index";
import { eq } from "drizzle-orm";

// Get all permanent exclusions
export async function getPermanentExclusions(): Promise<{
  genres: string[];
  artists: { id: string; name: string }[];
}> {
  const genres = await db.select().from(excludedGenres);
  const artists = await db.select().from(excludedArtists);

  return {
    genres: genres.map((g) => g.genre),
    artists: artists.map((a) => ({ id: a.artistId, name: a.artistName })),
  };
}

// Add a permanent genre exclusion
export async function addPermanentGenreExclusion(genre: string): Promise<void> {
  await db
    .insert(excludedGenres)
    .values({ genre: genre.toLowerCase() })
    .onConflictDoNothing();
}

// Remove a permanent genre exclusion
export async function removePermanentGenreExclusion(genre: string): Promise<void> {
  await db
    .delete(excludedGenres)
    .where(eq(excludedGenres.genre, genre.toLowerCase()));
}

// Add a permanent artist exclusion
export async function addPermanentArtistExclusion(
  artistId: string,
  artistName: string
): Promise<void> {
  await db
    .insert(excludedArtists)
    .values({ artistId, artistName })
    .onConflictDoNothing();
}

// Remove a permanent artist exclusion
export async function removePermanentArtistExclusion(artistId: string): Promise<void> {
  await db
    .delete(excludedArtists)
    .where(eq(excludedArtists.artistId, artistId));
}

// Get liked artists for seeding
export async function getLikedArtists(): Promise<{ id: string; name: string; weight: number }[]> {
  const artists = await db.select().from(likedArtists);
  return artists.map((a) => ({
    id: a.artistId,
    name: a.artistName,
    weight: a.weight,
  }));
}

// Add or update a liked artist
export async function addLikedArtist(
  artistId: string,
  artistName: string,
  weight: number = 1.0
): Promise<void> {
  await db
    .insert(likedArtists)
    .values({ artistId, artistName, weight })
    .onConflictDoUpdate({
      target: likedArtists.artistId,
      set: { weight, artistName },
    });
}

// Remove a liked artist
export async function removeLikedArtist(artistId: string): Promise<void> {
  await db.delete(likedArtists).where(eq(likedArtists.artistId, artistId));
}

// Get genre preferences
export async function getGenrePreferences(): Promise<{ genre: string; weight: number }[]> {
  const prefs = await db.select().from(genrePreferences);
  return prefs.map((p) => ({ genre: p.genre, weight: p.weight }));
}

// Add or update genre preference
export async function updateGenrePreference(
  genre: string,
  weight: number
): Promise<void> {
  await db
    .insert(genrePreferences)
    .values({ genre: genre.toLowerCase(), weight })
    .onConflictDoUpdate({
      target: genrePreferences.genre,
      set: { weight },
    });
}

// Clear all taste profile data
export async function clearTasteProfile(): Promise<void> {
  await db.delete(excludedGenres);
  await db.delete(excludedArtists);
  await db.delete(likedArtists);
  await db.delete(genrePreferences);
}
