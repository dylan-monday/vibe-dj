"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { LoginButton, LogoutButton } from "@/components/auth";
import {
  DevicePicker,
  NowPlayingBar,
  QueueList,
  HistoryList,
  VoiceDJToggle,
} from "@/components/player";
import { ChatPanel } from "@/components/chat";

type TabId = "chat" | "queue" | "history";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { activeDevice, currentTrack } = usePlaybackStore();
  const [activeTab, setActiveTab] = useState<TabId>("chat");

  // Start polling when authenticated
  usePlaybackPolling();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ambient">
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
      <div className="flex h-dvh items-center justify-center bg-ambient">
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

  // No device selected - show picker
  if (!activeDevice) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ambient">
        <div className="w-full max-w-md px-4">
          <div className="glass-elevated rounded-3xl p-8">
            <h2 className="text-2xl font-display text-center mb-6 text-foreground/90">
              Select a device
            </h2>
            <DevicePicker />
            <div className="mt-6 flex justify-center">
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main player view - chat-first with sticky player bar
  return (
    <div className="flex flex-col h-dvh bg-ambient">
      {/* Minimal header */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h1 className="text-lg font-display gradient-text">Vibe DJ</h1>
        <div className="flex items-center gap-3">
          <VoiceDJToggle />
          {activeDevice && (
            <div className="flex items-center gap-2 text-xs text-foreground/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="hidden sm:inline">{activeDevice.name}</span>
            </div>
          )}
          <LogoutButton />
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex-shrink-0 flex border-b border-white/5">
        {(["chat", "queue", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`
              flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-all relative
              ${activeTab === tab
                ? "text-foreground"
                : "text-foreground/40 hover:text-foreground/60"
              }
            `}
          >
            {tab === "chat" ? "Chat" : tab === "queue" ? "Up Next" : "History"}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-primary to-accent-magenta rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" && <ChatPanel />}
        {activeTab === "queue" && (
          <div className="h-full overflow-y-auto">
            <QueueList maxTracks={20} />
          </div>
        )}
        {activeTab === "history" && (
          <div className="h-full overflow-y-auto">
            <HistoryList maxTracks={30} />
          </div>
        )}
      </main>

      {/* Sticky now playing bar */}
      <footer className="flex-shrink-0 pb-safe">
        <NowPlayingBar />
      </footer>
    </div>
  );
}
