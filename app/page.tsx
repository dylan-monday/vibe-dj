"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { LoginButton, LogoutButton } from "@/components/auth";
import {
  NowPlayingHero,
  QueueDrawer,
} from "@/components/player";
import { ChatOverlay } from "@/components/chat";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthStore();
  const { currentTrack } = usePlaybackStore();
  const [showQueue, setShowQueue] = useState(false);

  // Always poll when authenticated — device is detected from playback state
  usePlaybackPolling(isAuthenticated);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ambient">
        <div className="text-center space-y-6">
          <h1 className="text-5xl font-display gradient-text">Vibe DJ</h1>
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ambient noise-overlay">
        <div className="relative z-10 text-center space-y-10 px-8">
          <div className="space-y-4">
            <h1 className="text-7xl sm:text-8xl font-display gradient-text leading-none tracking-tight">
              Vibe DJ
            </h1>
            <p className="text-foreground/40 text-base tracking-wide max-w-xs mx-auto">
              Describe a vibe, hear it immediately
            </p>
          </div>
          <LoginButton />
        </div>
      </div>
    );
  }

  // Main app — no device picker gate, polling detects active device automatically
  const albumArt = currentTrack?.album.images[0]?.url;

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {albumArt && (
        <div className="absolute inset-0 z-0">
          <img
            src={albumArt}
            alt=""
            className="w-full h-full object-cover scale-110 blur-[80px] opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background/90" />
        </div>
      )}
      {!albumArt && <div className="absolute inset-0 z-0 bg-ambient" />}

      <div className="absolute inset-0 z-[1] noise-overlay pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        <header className="flex items-center justify-between px-5 pt-4 pb-2">
          <h1 className="text-sm font-display text-foreground/30 tracking-wider uppercase">
            Vibe DJ
          </h1>
          <LogoutButton />
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
          <NowPlayingHero
            onQueueToggle={() => setShowQueue(!showQueue)}
            showQueue={showQueue}
          />
        </div>

        <ChatOverlay />
      </div>

      <QueueDrawer open={showQueue} onClose={() => setShowQueue(false)} />
    </div>
  );
}
