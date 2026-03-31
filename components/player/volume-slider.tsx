"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";

export function VolumeSlider() {
  const { volume, changeVolume, activeDevice } = usePlaybackStore();
  const [localVolume, setLocalVolume] = useState(volume);
  const [isDragging, setIsDragging] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const previousVolume = useRef(volume);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with store volume when not dragging
  useEffect(() => {
    if (!isDragging) {
      setLocalVolume(volume);
    }
  }, [volume, isDragging]);

  // Debounced API call
  const debouncedVolumeChange = useCallback((newVolume: number) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      changeVolume(newVolume);
    }, 100);
  }, [changeVolume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value, 10);
    setLocalVolume(newVolume);
    setIsMuted(newVolume === 0);
    debouncedVolumeChange(newVolume);
  };

  const toggleMute = () => {
    if (isMuted || localVolume === 0) {
      // Unmute - restore previous volume
      const restoreVolume = previousVolume.current > 0 ? previousVolume.current : 50;
      setLocalVolume(restoreVolume);
      setIsMuted(false);
      changeVolume(restoreVolume);
    } else {
      // Mute
      previousVolume.current = localVolume;
      setLocalVolume(0);
      setIsMuted(true);
      changeVolume(0);
    }
  };

  // Volume icons
  const VolumeIcon = () => {
    if (isMuted || localVolume === 0) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0021 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 003.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
        </svg>
      );
    }
    if (localVolume < 50) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
      </svg>
    );
  };

  const isDisabled = !activeDevice;

  return (
    <div className="flex items-center gap-3 w-full max-w-[200px]">
      {/* Mute toggle */}
      <button
        onClick={toggleMute}
        disabled={isDisabled}
        className={`
          w-10 h-10 flex items-center justify-center rounded-full shrink-0
          transition-colors
          ${isDisabled
            ? "text-foreground/30 cursor-not-allowed"
            : "text-foreground/70 hover:text-foreground hover:bg-surface-elevated"
          }
        `}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        <VolumeIcon />
      </button>

      {/* Volume slider */}
      <div className="flex-1 relative">
        <input
          type="range"
          min={0}
          max={100}
          value={localVolume}
          onChange={handleVolumeChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={isDisabled}
          className={`
            w-full h-10 appearance-none bg-transparent cursor-pointer
            [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full
            [&::-webkit-slider-runnable-track]:bg-surface-elevated
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground
            [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:shadow-md
            ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          style={{
            // Custom track fill via CSS gradient
            background: isDisabled
              ? undefined
              : `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${localVolume}%, transparent ${localVolume}%)`,
          }}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}
