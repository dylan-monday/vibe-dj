"use client";

// AuthProvider - Handles auth initialization and OAuth callback processing
// Wrap app in this to enable authentication

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { exchangeCodeForTokens } from "@/lib/spotify/auth";
import { getSpotifyClient } from "@/lib/spotify/client";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { initialize, setUser, setError } = useAuthStore();
  const initialized = useRef(false);

  console.log("[AuthProvider] Render, initialized:", initialized.current, "code:", searchParams.get("code")?.slice(0, 10));

  // Handle OAuth callback and initialize auth
  useEffect(() => {
    console.log("[AuthProvider] useEffect running, initialized:", initialized.current);
    if (initialized.current) return;
    initialized.current = true;

    async function handleAuth() {
      console.log("[AuthProvider] handleAuth starting");

      // CRITICAL: Initialize rate limit state BEFORE any API calls
      const { initializeRateLimitState } = await import("@/lib/spotify/rate-limit");
      initializeRateLimitState();

      const code = searchParams.get("code");
      const error = searchParams.get("error");

      // Handle OAuth error
      if (error) {
        setError(error);
        // Clear URL params immediately
        window.history.replaceState({}, "", "/");
        return;
      }

      // Handle OAuth callback with code
      if (code) {
        // Clear URL params immediately to prevent reuse on refresh
        window.history.replaceState({}, "", "/");

        // Check if we have a PKCE verifier - if not, code was already used
        const hasVerifier = typeof window !== "undefined" &&
          sessionStorage.getItem("spotify-pkce-verifier");

        if (!hasVerifier) {
          // Code already exchanged, just initialize from stored tokens (no profile fetch - already done)
          await initialize();
          return;
        }

        try {
          console.log("[Auth] Exchanging code for tokens...");
          await exchangeCodeForTokens(code);
          console.log("[Auth] Token exchange successful, initializing...");
          // Initialize auth state after token exchange
          await initialize();
          // Fetch user profile after successful auth
          await fetchUserProfile();
          console.log("[Auth] Auth complete");
        } catch (err) {
          console.error("[Auth] Token exchange failed:", err);
          setError(err instanceof Error ? err.message : "Authentication failed");
          // Still call initialize to reset loading state
          await initialize();
        }
        return;
      }

      // No code - just initialize from stored tokens
      await initialize();

      // If authenticated, fetch user profile
      const client = getSpotifyClient();
      if (client) {
        await fetchUserProfile();
      }
    }

    handleAuth();
  }, [searchParams, router, initialize, setError]);

  async function fetchUserProfile() {
    const client = getSpotifyClient();
    if (!client) return;

    // Check rate limit before profile fetch
    const { isRateLimited } = await import("@/lib/spotify/rate-limit");
    if (isRateLimited()) {
      console.log("[Auth] Skipping user profile fetch - rate limited");
      return;
    }

    try {
      const profile = await client.currentUser.profile();
      setUser({
        id: profile.id,
        email: profile.email || "",
        displayName: profile.display_name || profile.id,
      });
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  }

  return <>{children}</>;
}
