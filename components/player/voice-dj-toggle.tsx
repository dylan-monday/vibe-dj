"use client";

import { useVoiceDJ } from "@/lib/hooks/use-voice-dj";

export function VoiceDJToggle() {
  const { isSpeaking, isLoading, hasTrack, speak } = useVoiceDJ();

  if (!hasTrack) return null;

  return (
    <button
      onClick={speak}
      disabled={isLoading}
      className={`
        relative flex items-center justify-center w-10 h-10 rounded-full
        transition-all duration-300
        ${isSpeaking
          ? "bg-primary/30 text-primary scale-110"
          : isLoading
            ? "bg-white/5 text-foreground/40 animate-pulse"
            : "bg-white/5 text-foreground/60 hover:text-primary hover:bg-primary/10 active:scale-95"
        }
      `}
      title="Hear about this track"
    >
      <svg
        className={`w-5 h-5 ${isSpeaking ? "animate-pulse" : ""}`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
        />
      </svg>

      {isSpeaking && (
        <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      )}
    </button>
  );
}
