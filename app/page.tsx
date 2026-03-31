"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { LoginButton, LogoutButton } from "@/components/auth";
import {
  DevicePicker,
  NowPlaying,
  PlaybackControls,
  VolumeSlider,
  QueueList,
  HistoryList,
} from "@/components/player";

type TabId = "queue" | "history";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const { activeDevice, currentTrack } = usePlaybackStore();
  const [activeTab, setActiveTab] = useState<TabId>("queue");

  // Start polling when authenticated
  // This hook handles Page Visibility and interval management
  usePlaybackPolling();

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

  // Authenticated - main player view
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-background/80 backdrop-blur-sm border-b border-surface/50">
        <h1 className="text-lg font-display text-primary">Vibe DJ</h1>
        <div className="flex items-center gap-4">
          {activeDevice && (
            <span className="text-xs text-foreground/50 hidden sm:inline">
              {activeDevice.name}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col">
        {/* No device selected - show picker */}
        {!activeDevice && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
              <h2 className="text-xl text-center mb-4">Select a device</h2>
              <DevicePicker />
            </div>
          </div>
        )}

        {/* Device selected - show player */}
        {activeDevice && (
          <>
            {/* Now Playing section */}
            <section className="py-6">
              <NowPlaying />
            </section>

            {/* Playback Controls */}
            <section className="py-4">
              <PlaybackControls />
            </section>

            {/* Volume */}
            <section className="flex justify-center py-2">
              <VolumeSlider />
            </section>

            {/* Queue/History tabs */}
            <section className="flex-1 flex flex-col border-t border-surface mt-4">
              {/* Tab headers */}
              <div className="flex border-b border-surface">
                <button
                  onClick={() => setActiveTab("queue")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "queue"
                      ? "text-primary border-b-2 border-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  Up Next
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    activeTab === "history"
                      ? "text-primary border-b-2 border-primary"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  History
                </button>
              </div>

              {/* Tab content */}
              <div className="flex-1 bg-surface/30">
                {activeTab === "queue" && <QueueList maxTracks={10} />}
                {activeTab === "history" && <HistoryList maxTracks={20} />}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Safe area padding for iOS */}
      <div className="pb-safe" />
    </div>
  );
}
