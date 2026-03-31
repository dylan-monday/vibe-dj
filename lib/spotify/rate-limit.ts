// Global rate limit state shared across all Spotify API consumers
// Prevents curation searches from firing when polling just got a 429
// Persisted to localStorage so it survives page refreshes

const STORAGE_KEY = "vibe-dj-rate-limit-until";

// Initialize from localStorage (survives page refresh)
function loadRateLimitedUntil(): number {
  if (typeof window === "undefined") return 0;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return 0;
  const ts = parseInt(stored, 10);
  // If it's in the past, clear it
  if (ts <= Date.now()) {
    localStorage.removeItem(STORAGE_KEY);
    return 0;
  }
  return ts;
}

let rateLimitedUntil = 0;
let initialized = false;

// Eager init on first access with race protection
function getRateLimitedUntil(): number {
  if (!initialized) {
    initialized = true;
    rateLimitedUntil = loadRateLimitedUntil();
  }
  return rateLimitedUntil;
}

// Force immediate initialization (call from auth-provider before any API calls)
export function initializeRateLimitState(): void {
  if (!initialized) {
    initialized = true;
    rateLimitedUntil = loadRateLimitedUntil();
    if (rateLimitedUntil > 0) {
      console.log("[RateLimit] Initialized from localStorage - rate limited until", new Date(rateLimitedUntil).toISOString());
    }
  }
}

/** Mark Spotify as rate-limited for the given duration */
export function setRateLimited(durationMs: number): void {
  rateLimitedUntil = Date.now() + durationMs;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, rateLimitedUntil.toString());
  }
}

/** Clear rate limit state (call when user clicks "try again") */
export function clearRateLimit(): void {
  rateLimitedUntil = 0;
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/** Check if we're currently in a rate-limit backoff window */
export function isRateLimited(): boolean {
  return Date.now() < getRateLimitedUntil();
}

/** Milliseconds remaining in the current backoff (0 if not limited) */
export function rateLimitRemainingMs(): number {
  return Math.max(0, getRateLimitedUntil() - Date.now());
}

/** Wait until the rate limit window expires (returns immediately if not limited) */
export async function waitForRateLimit(): Promise<void> {
  const remaining = rateLimitRemainingMs();
  if (remaining > 0) {
    await new Promise((r) => setTimeout(r, remaining));
  }
}
