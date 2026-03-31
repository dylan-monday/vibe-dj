import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// Create data directory if needed
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";

const dbPath =
  process.env.DATABASE_URL?.replace("file:", "") || "./data/vibe-dj.db";
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
