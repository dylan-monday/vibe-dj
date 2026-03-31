"use client";

import { usePlaybackStore } from "@/lib/stores/playback-store";

interface QuickActionsProps {
  onAction: (action: string) => void;
  isDisabled: boolean;
}

// SVG Icons as components
const EnergyUpIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const EnergyDownIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
  </svg>
);

const HeartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

export function QuickActions({ onAction, isDisabled }: QuickActionsProps) {
  const { currentTrack } = usePlaybackStore();

  // Only show when music is playing
  if (!currentTrack) {
    return null;
  }

  const actions = [
    { id: "energy_up", label: "More Energy", icon: <EnergyUpIcon /> },
    { id: "energy_down", label: "Calmer", icon: <EnergyDownIcon /> },
    { id: "more_like_this", label: "More Like This", icon: <HeartIcon /> },
  ];

  return (
    <div className="flex gap-2 px-4 py-3 border-t border-white/5">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          disabled={isDisabled}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-sm
            btn-ghost transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            hover:scale-105 active:scale-95
          `}
        >
          <span className="text-primary">{action.icon}</span>
          <span className="text-foreground/80">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
