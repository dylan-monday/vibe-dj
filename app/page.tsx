"use client";

import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { LoginButton, LogoutButton } from "@/components/auth";
import { DevicePicker } from "@/components/player";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { activeDevice } = usePlaybackStore();

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

  // Authenticated - show device picker
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between p-4 border-b border-surface">
        <h1 className="text-xl font-display text-primary">Vibe DJ</h1>
        <LogoutButton />
      </header>

      <div className="flex-1 p-4 space-y-6">
        {/* Welcome message */}
        <div className="text-center">
          <p className="text-2xl">Welcome, {user?.displayName || "DJ"}!</p>
          {activeDevice ? (
            <p className="text-foreground/70">
              Playing on {activeDevice.name}
            </p>
          ) : (
            <p className="text-foreground/70">
              Select a device to start playing
            </p>
          )}
        </div>

        {/* Device picker */}
        <div className="max-w-md mx-auto">
          <DevicePicker />
        </div>

        {/* Status message for Phase 2 */}
        {activeDevice && (
          <div className="text-center text-foreground/50 text-sm">
            <p>Phase 1 complete. Playback controls coming in Phase 2.</p>
          </div>
        )}
      </div>
    </div>
  );
}
