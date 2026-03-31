"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";
import { useQueueStore } from "@/lib/stores/queue-store";
import { useInterpolatedProgress } from "@/lib/hooks/use-interpolated-progress";
import { VoiceDJToggle } from "./voice-dj-toggle";
import { usePlaybackPolling } from "@/lib/hooks/use-playback-polling";
import { clearRateLimit } from "@/lib/spotify/rate-limit";

interface NowPlayingHeroProps {
  onQueueToggle: () => void;
  showQueue: boolean;
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function NowPlayingHero({ onQueueToggle, showQueue }: NowPlayingHeroProps) {
  const {
    currentTrack,
    isPlaying,
    pollingError,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
  } = usePlaybackStore();
  const { upcomingTracks } = useQueueStore();
  const { progressMs, progressPercent } = useInterpolatedProgress();
  const { resetCircuitBreaker, poll } = usePlaybackPolling();

  const handleRetry = () => {
    clearRateLimit(); // Clear persisted rate limit
    resetCircuitBreaker();
    poll();
  };

  // Empty state - no track playing
  if (!currentTrack) {
    const isCircuitOpen = pollingError === "circuit_open";
    const isRateLimited = pollingError === "rate_limited";
    const hasError = isCircuitOpen || isRateLimited;

    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="w-48 h-48 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          {hasError ? (
            <svg className="w-12 h-12 text-amber-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ) : (
            <svg className="w-16 h-16 text-foreground/10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          )}
        </div>
        <div>
          {isCircuitOpen ? (
            <>
              <p className="text-sm font-medium text-amber-400/70">Connection paused</p>
              <p className="text-xs text-foreground/30 mt-1">Too many errors — polling stopped to protect your account</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium hover:bg-primary/30 transition-colors"
              >
                Try again
              </button>
            </>
          ) : isRateLimited ? (
            <>
              <p className="text-sm font-medium text-amber-400/70">Spotify rate limited</p>
              <p className="text-xs text-foreground/30 mt-1">Wait a minute, then try again</p>
              <button
                onClick={handleRetry}
                className="mt-4 px-4 py-2 rounded-full bg-white/5 text-foreground/50 text-sm font-medium hover:bg-white/10 transition-colors"
              >
                Retry now
              </button>
            </>
          ) : (
            <>
              <p className="text-lg font-display text-foreground/20">Nothing playing</p>
              <p className="text-sm text-foreground/10 mt-1">Open Spotify and play something</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const albumArt = currentTrack.album.images[0]?.url;
  const artistNames = currentTrack.artists.map((a) => a.name).join(", ");

  return (
    <div className="flex flex-col items-center gap-5 w-full max-w-sm">
      {/* Album art - large, floating */}
      <div className="relative group">
        <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 album-art-glow">
          {albumArt ? (
            <img
              src={albumArt}
              alt={currentTrack.album.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-surface flex items-center justify-center">
              <svg className="w-16 h-16 text-foreground/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
          )}
        </div>
        {/* Glow underneath */}
        {albumArt && (
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-8 rounded-full blur-2xl opacity-40"
            style={{
              background: "linear-gradient(90deg, var(--color-primary), var(--color-accent-magenta))",
            }}
          />
        )}
      </div>

      {/* Track info */}
      <div className="text-center space-y-1 mt-2">
        <h2 className="text-xl sm:text-2xl font-display text-foreground leading-tight">
          {currentTrack.name}
        </h2>
        <p className="text-sm text-foreground/50">{artistNames}</p>
      </div>

      {/* Progress bar */}
      <div className="w-full space-y-1.5">
        <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary/80 to-accent-magenta/60 rounded-full transition-[width] duration-100 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-foreground/25 font-mono tabular-nums">
          <span>{formatTime(progressMs)}</span>
          <span>{formatTime(currentTrack.durationMs)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Previous */}
        <button
          onClick={() => skipToPrevious()}
          className="w-11 h-11 flex items-center justify-center rounded-full text-foreground/40 hover:text-foreground/80 hover:bg-white/5 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={() => togglePlayPause()}
          className="w-14 h-14 flex items-center justify-center rounded-full bg-white text-background hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10"
        >
          {isPlaying ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.14v14l11-7-11-7z" />
            </svg>
          )}
        </button>

        {/* Next */}
        <button
          onClick={() => skipToNext()}
          className="w-11 h-11 flex items-center justify-center rounded-full text-foreground/40 hover:text-foreground/80 hover:bg-white/5 transition-all active:scale-90"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zm10 0V6h2v12h-2z" />
          </svg>
        </button>
      </div>

      {/* Secondary actions row */}
      <div className="flex items-center gap-3 mt-1">
        <VoiceDJToggle />

        {/* Queue toggle */}
        <button
          onClick={onQueueToggle}
          className={`
            flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-medium transition-all
            ${showQueue
              ? "bg-primary/20 text-primary"
              : "bg-white/5 text-foreground/40 hover:text-foreground/60 hover:bg-white/8"
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
          </svg>
          {upcomingTracks.length > 0 && (
            <span>{upcomingTracks.length}</span>
          )}
        </button>
      </div>
    </div>
  );
}
