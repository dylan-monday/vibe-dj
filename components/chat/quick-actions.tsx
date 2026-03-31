"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

interface QuickActionsProps {
  onAction: (action: string) => void;
  isDisabled: boolean;
}

export function QuickActions({ onAction, isDisabled }: QuickActionsProps) {
  const { currentTrack } = usePlaybackStore();

  // Only show when music is playing
  if (!currentTrack) {
    return null;
  }

  const actions = [
    { id: "energy_up", label: "More Energy", icon: "⚡" },
    { id: "energy_down", label: "Calmer", icon: "🌙" },
    { id: "more_like_this", label: "More Like This", icon: "❤️" },
  ];

  return (
    <div className="flex gap-2 px-4 py-2 border-t border-white/10">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={isDisabled}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm
            bg-white/5 hover:bg-white/10 border border-white/10
            transition-all duration-150
            disabled:opacity-50 disabled:cursor-not-allowed
            active:scale-95
          `}
        >
          <span>{action.icon}</span>
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}
