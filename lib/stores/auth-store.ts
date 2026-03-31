// Auth state store using Zustand
// Manages authentication state and coordinates with Spotify auth module

import { create } from "zustand";
import { TokenState } from "@/lib/spotify/types";
import {
  loadTokens,
  logout as spotifyLogout,
  ensureValidToken,
  buildAuthUrl,
} from "@/lib/spotify/auth";

interface AuthState {
  // State
  isAuthenticated: boolean;
  isLoading: boolean;
  user: { id: string; email: string; displayName: string } | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => void;
  setUser: (user: AuthState["user"]) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null,

  // Initialize auth state on app load
  initialize: async () => {
    console.log("[AuthStore] initialize() called");
    set({ isLoading: true, error: null });

    try {
      const hasValidToken = await ensureValidToken();
      console.log("[AuthStore] ensureValidToken returned:", hasValidToken);
      set({
        isAuthenticated: hasValidToken,
        isLoading: false,
      });
    } catch (error) {
      console.error("[AuthStore] initialize error:", error);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: error instanceof Error ? error.message : "Auth initialization failed",
      });
    }
  },

  // Start OAuth login flow
  login: async () => {
    set({ isLoading: true, error: null });
    try {
      const authUrl = await buildAuthUrl();
      // Redirect to Spotify OAuth
      window.location.href = authUrl;
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : "Login failed",
      });
    }
  },

  // Logout and clear state
  logout: () => {
    spotifyLogout();
    set({
      isAuthenticated: false,
      user: null,
      error: null,
    });
  },

  setUser: (user) => set({ user }),
  setError: (error) => set({ error }),
}));
