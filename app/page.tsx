"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { LoginButton, LogoutButton } from "@/components/auth";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-display text-primary">Vibe DJ</h1>
          <p className="text-foreground/70">
            Connect to Spotify to get started
          </p>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Authenticated - show placeholder for next phase
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4 border-b border-surface">
        <h1 className="text-xl font-display text-primary">Vibe DJ</h1>
        <LogoutButton />
      </header>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-2xl">Welcome, {user?.displayName || "DJ"}!</p>
          <p className="text-foreground/70">
            Spotify connected. Device selection coming in Plan 03.
          </p>
        </div>
      </div>
    </div>
  );
}
