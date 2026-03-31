// Shared Spotify API error handling utilities

import { refreshTokens } from "./auth";
import { setRateLimited } from "./rate-limit";

// Error types for caller handling
export class SpotifyApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

// Exponential backoff state
let backoffMs = 1000;
const MAX_BACKOFF_MS = 32000;

function resetBackoff() {
  backoffMs = 1000;
}

function getNextBackoff(): number {
  const current = backoffMs;
  backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
  return current;
}

// Wrapper for API calls with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  try {
    const result = await operation();
    resetBackoff();
    return result;
  } catch (error: unknown) {
    // Log full error details to understand what Spotify is returning
    console.error("[withErrorHandling] Caught error:", {
      message: error instanceof Error ? error.message : String(error),
      status: (error as { status?: number })?.status,
      statusCode: (error as { statusCode?: number })?.statusCode,
      body: (error as { body?: unknown })?.body,
      headers: (error as { headers?: unknown })?.headers,
      name: error instanceof Error ? error.name : undefined,
    });
    // Handle 401 - token expired
    if (isSpotifyError(error, 401)) {
      if (retryCount < 1) {
        const refreshed = await refreshTokens();
        if (refreshed) {
          return withErrorHandling(operation, retryCount + 1);
        }
      }
      throw new SpotifyApiError("Authentication expired. Please log in again.", 401);
    }

    // Handle 429 - rate limited (no retry - just back off and let user wait)
    // Check both status code AND error message patterns for rate limits
    const isRateLimit = isSpotifyError(error, 429) || isRateLimitError(error);

    if (isRateLimit) {
      // Set global rate limit so other consumers (curation, polling) back off
      // Default to 60s if no Retry-After header (Spotify SDK often doesn't expose it)
      const retryAfterMs = getRetryAfter(error) ?? 60000;
      setRateLimited(retryAfterMs);

      console.log("[withErrorHandling] Rate limit detected - backing off for", retryAfterMs, "ms");

      // Don't retry rate limits - just fail and let the UI show the wait message
      throw new SpotifyApiError(
        "Rate limited. Please wait before trying again.",
        429,
        retryAfterMs
      );
    }

    // Handle 5xx - server errors
    if (isSpotifyError(error, 500) || isSpotifyError(error, 502) || isSpotifyError(error, 503)) {
      if (retryCount < 2) {
        await sleep(getNextBackoff());
        return withErrorHandling(operation, retryCount + 1);
      }
      throw new SpotifyApiError(
        "Spotify is temporarily unavailable. Please try again.",
        (error as { status?: number }).status || 500
      );
    }

    // Handle 204 - no active device/playback
    if (isSpotifyError(error, 204)) {
      throw new SpotifyApiError("No active playback", 204);
    }

    // Handle 404 - resource not found (often no active device)
    if (isSpotifyError(error, 404)) {
      throw new SpotifyApiError(
        "No active Spotify device found. Open Spotify and start playing something first.",
        404
      );
    }

    // Handle 403 - forbidden (often missing scopes)
    if (isSpotifyError(error, 403)) {
      throw new SpotifyApiError(
        "Permission denied. Try logging out and back in to refresh permissions.",
        403
      );
    }

    // Re-throw unknown errors with better formatting
    if (error instanceof Error) {
      throw new SpotifyApiError(error.message, 500);
    }
    throw error;
  }
}

function isSpotifyError(error: unknown, statusCode: number): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  // Check for status property (common SDK format)
  if ("status" in error && (error as { status: number }).status === statusCode) {
    return true;
  }

  // Check for statusCode property
  if ("statusCode" in error && (error as { statusCode: number }).statusCode === statusCode) {
    return true;
  }

  // Check error message for status code (SDK format: "Unrecognised response code: 404")
  if (error instanceof Error && error.message.includes(`response code: ${statusCode}`)) {
    return true;
  }

  return false;
}

// Dedicated rate limit detection (catches more patterns than isSpotifyError)
function isRateLimitError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  // Check error message for rate limit keywords
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("rate limit") ||
      msg.includes("too many requests") ||
      msg.includes("exceeded") ||
      msg.includes("429")
    ) {
      return true;
    }
  }

  // Check for 429 in any status/statusCode/code property
  const errorObj = error as Record<string, unknown>;
  if (
    errorObj.status === 429 ||
    errorObj.statusCode === 429 ||
    errorObj.code === 429 ||
    errorObj.code === "429"
  ) {
    return true;
  }

  return false;
}

function getRetryAfter(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "headers" in error &&
    typeof (error as { headers: unknown }).headers === "object"
  ) {
    const headers = (error as { headers: Record<string, string> }).headers;
    const retryAfter = headers["retry-after"];
    if (retryAfter) {
      return parseInt(retryAfter, 10) * 1000;
    }
  }
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
