"use client";

// Hook for handling Spotify API errors consistently across components
// Implements UI-03 error recovery requirements

import { useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { SpotifyApiError } from "@/lib/spotify/devices";

interface ErrorHandler {
  handleError: (error: unknown) => {
    message: string;
    action: "retry" | "reauth" | "wait" | "none";
    retryAfter?: number;
  };
}

export function useSpotifyErrorHandler(): ErrorHandler {
  const { logout } = useAuthStore();

  const handleError = useCallback(
    (error: unknown) => {
      // Handle SpotifyApiError with known status codes
      if (error instanceof SpotifyApiError) {
        switch (error.statusCode) {
          case 401:
            // Token expired and couldn't refresh - force re-auth
            logout();
            return {
              message: "Session expired. Please log in again.",
              action: "reauth" as const,
            };

          case 429:
            return {
              message: "Too many requests. Please wait a moment.",
              action: "wait" as const,
              retryAfter: error.retryAfter || 5000,
            };

          case 204:
            return {
              message: "No active device. Open Spotify on a device first.",
              action: "none" as const,
            };

          case 500:
          case 502:
          case 503:
            return {
              message: "Spotify is temporarily unavailable.",
              action: "retry" as const,
            };

          default:
            return {
              message: error.message,
              action: "retry" as const,
            };
        }
      }

      // Handle generic errors
      return {
        message: error instanceof Error ? error.message : "An error occurred",
        action: "retry" as const,
      };
    },
    [logout]
  );

  return { handleError };
}
