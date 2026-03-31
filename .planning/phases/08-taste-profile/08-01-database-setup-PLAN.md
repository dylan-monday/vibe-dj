---
phase: 8
plan: 1
title: Database Setup
wave: 1
depends_on: [07-01-playlist-export]
files_modified:
  - package.json
  - drizzle.config.ts
  - lib/db/schema.ts
  - lib/db/index.ts
requirements_addressed: [PERS-03]
autonomous: true
---

<objective>
Set up SQLite database with Drizzle ORM for persistent taste profile storage.

Purpose: Store user preferences across sessions (permanent exclusions, artist preferences).
Output: Database infrastructure ready for taste profile operations.
</objective>

<must_haves>
- SQLite database file in data/ directory
- Drizzle ORM configuration
- Schema for taste preferences
- Database client export
</must_haves>

<task id="1">
<title>Install Database Dependencies</title>
<action>
```bash
npm install drizzle-orm better-sqlite3
npm install -D drizzle-kit @types/better-sqlite3
```
</action>
<acceptance_criteria>
- drizzle-orm installed
- better-sqlite3 installed
- drizzle-kit for migrations
</acceptance_criteria>
</task>

<task id="2">
<title>Create Drizzle Config</title>
<action>
Create drizzle.config.ts:

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL || "file:./data/vibe-dj.db",
  },
});
```
</action>
<acceptance_criteria>
- Drizzle config points to SQLite file
- Schema location configured
</acceptance_criteria>
</task>

<task id="3">
<title>Create Database Schema</title>
<action>
Create lib/db/schema.ts:

```typescript
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
```
</action>
<acceptance_criteria>
- Tables for exclusions and preferences
- Timestamps for tracking
- Unique constraints on genre/artist
</acceptance_criteria>
</task>

<task id="4">
<title>Create Database Client</title>
<action>
Create lib/db/index.ts:

```typescript
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Create data directory if needed
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/vibe-dj.db";
const dir = dirname(dbPath);
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
}

// Initialize SQLite connection
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");

// Create Drizzle client
export const db = drizzle(sqlite, { schema });

// Export schema for use in queries
export * from "./schema";
```
</action>
<acceptance_criteria>
- Database connection created
- WAL mode for better concurrency
- Auto-creates data directory
</acceptance_criteria>
</task>

<task id="5">
<title>Create Data Directory</title>
<action>
```bash
mkdir -p data
echo "*.db" >> data/.gitignore
```
</action>
<acceptance_criteria>
- data/ directory exists
- Database files gitignored
</acceptance_criteria>
</task>

<verification>
```bash
npx tsc --noEmit
npx drizzle-kit push
```
</verification>
