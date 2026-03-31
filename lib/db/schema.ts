import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Permanent genre exclusions
export const excludedGenres = sqliteTable("excluded_genres", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  genre: text("genre").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Permanent artist exclusions
export const excludedArtists = sqliteTable("excluded_artists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artistId: text("artist_id").notNull().unique(),
  artistName: text("artist_name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Liked artists (for seeding)
export const likedArtists = sqliteTable("liked_artists", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  artistId: text("artist_id").notNull().unique(),
  artistName: text("artist_name").notNull(),
  weight: real("weight").notNull().default(1.0), // Higher = more preferred
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Genre preferences (positive weights)
export const genrePreferences = sqliteTable("genre_preferences", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  genre: text("genre").notNull().unique(),
  weight: real("weight").notNull().default(1.0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
