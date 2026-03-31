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
import { ChatPanel } from "@/components/chat";

type TabId = "chat" | "queue" | "history";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { activeDevice } = usePlaybackStore();
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Start polling when authenticated
  usePlaybackPolling();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ambient">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-display gradient-text">Vibe DJ</h1>
          <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ambient">
        <div className="text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-6xl font-display gradient-text">Vibe DJ</h1>
            <p className="text-foreground/60 text-lg">
              Describe a vibe, hear it immediately
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Authenticated - main player view
  return (
    <div className="flex min-h-screen flex-col bg-ambient relative">
      {/* Floating header with glass effect */}
      <header className="sticky top-0 z-50 mx-4 mt-4">
        <div className="glass-elevated rounded-2xl px-5 py-3 flex items-center justify-between">
          <h1 className="text-xl font-display gradient-text">Vibe DJ</h1>
          <div className="flex items-center gap-4">
            {activeDevice && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-foreground/60 hidden sm:inline">
                  {activeDevice.name}
                </span>
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col px-4 pb-4">
        {/* No device selected - show picker */}
        {!activeDevice && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="w-full max-w-md">
              <div className="glass-elevated rounded-3xl p-8">
                <h2 className="text-2xl font-display text-center mb-6 text-foreground/90">
                  Select a device
                </h2>
                <DevicePicker />
              </div>
            </div>
          </div>
        )}

        {/* Device selected - show player */}
        {activeDevice && (
          <div className="flex-1 flex flex-col gap-4 mt-4">
            {/* Now Playing card - hero element */}
            <section className="glass-elevated rounded-3xl p-6 relative overflow-hidden">
              <NowPlaying />
            </section>

            {/* Controls card */}
            <section className="glass rounded-2xl p-6">
              <PlaybackControls />
              <div className="flex justify-center mt-4">
                <VolumeSlider />
              </div>
            </section>

            {/* Chat/Queue/History panel */}
            <section className="flex-1 flex flex-col glass-elevated rounded-3xl overflow-hidden min-h-[320px]">
              {/* Tab headers */}
              <div className="flex border-b border-white/5">
                {(["chat", "queue", "history"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`
                      flex-1 py-4 text-sm font-medium transition-all relative
                      ${activeTab === tab
                        ? "text-foreground tab-active"
                        : "text-foreground/50 hover:text-foreground/70"
                      }
                    `}
                  >
                    {tab === "chat" ? "Chat" : tab === "queue" ? "Up Next" : "History"}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === "chat" && <ChatPanel />}
                {activeTab === "queue" && <QueueList maxTracks={10} />}
                {activeTab === "history" && <HistoryList maxTracks={20} />}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Safe area padding for iOS */}
      <div className="pb-safe" />
    </div>
  );
}
