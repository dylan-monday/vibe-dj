import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

// Database connection - only available in Node.js environments (not Vercel serverless)
let db: BetterSQLite3Database<typeof schema> | null = null;

function getDb(): BetterSQLite3Database<typeof schema> | null {
  if (db) return db;

  // Skip database in serverless environments
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    console.warn("SQLite not available in serverless environment");
    return null;
  }

  try {
    // Dynamic import to avoid bundling issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require("better-sqlite3");
    const { mkdirSync, existsSync } = require("fs");
    const { dirname } = require("path");

    const dbPath =
      process.env.DATABASE_URL?.replace("file:", "") || "./data/vibe-dj.db";
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const sqlite = new Database(dbPath);
    sqlite.pragma("journal_mode = WAL");
    db = drizzle(sqlite, { schema });
    return db;
  } catch (error) {
    console.warn("SQLite initialization failed:", error);
    return null;
  }
}

export { getDb };
export * from "./schema";
