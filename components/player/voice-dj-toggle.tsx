"use client";

import { useVoiceDJ } from "@/lib/hooks/use-voice-dj";

export function VoiceDJToggle() {
  const { isEnabled, isSpeaking, toggleEnabled } = useVoiceDJ();

  return (
    <button
      onClick={toggleEnabled}
      className={`
        relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
        transition-all duration-300
        ${isEnabled
          ? "bg-primary/20 text-primary border border-primary/40"
          : "glass-elevated text-foreground/60 hover:text-foreground/80"
        }
      `}
      title={isEnabled ? "Disable voice DJ" : "Enable voice DJ"}
    >
      {/* Microphone icon */}
      <svg
        className={`w-4 h-4 ${isSpeaking ? "animate-pulse" : ""}`}
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
      <span>DJ</span>

      {/* Speaking indicator */}
      {isSpeaking && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
        </span>
      )}
    </button>
  );
}
