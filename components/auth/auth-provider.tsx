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

  // Handle OAuth callback and initialize auth
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    async function handleAuth() {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      // Handle OAuth error
      if (error) {
        setError(error);
        // Clear URL params
        router.replace("/", { scroll: false });
        return;
      }

      // Handle OAuth callback with code
      if (code) {
        try {
          await exchangeCodeForTokens(code);
          // Initialize auth state after token exchange
          await initialize();
          // Fetch user profile after successful auth
          await fetchUserProfile();
          // Clear URL params
          router.replace("/", { scroll: false });
        } catch (err) {
          setError(err instanceof Error ? err.message : "Authentication failed");
          router.replace("/", { scroll: false });
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
