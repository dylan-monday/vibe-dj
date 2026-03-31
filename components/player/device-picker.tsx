"use client";

// Device picker - Shows available Spotify Connect devices
// Allows user to select playback target (e.g., Sonos speakers)

import { useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { getDeviceIcon, isSonosDevice } from "@/lib/spotify/devices";

export function DevicePicker() {
  const {
    devices,
    activeDevice,
    isLoadingDevices,
    deviceError,
    fetchDevices,
    selectDevice,
    clearDeviceError,
  } = usePlaybackStore();

  // Fetch devices on mount, auto-retry on rate limit
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);


  // Device icon component
  const DeviceIcon = ({ type }: { type: string }) => {
    const icon = getDeviceIcon(type);
    return (
      <span className="text-lg" aria-hidden>
        {icon === "laptop" && "💻"}
        {icon === "smartphone" && "📱"}
        {icon === "speaker" && "🔊"}
        {icon === "tv" && "📺"}
        {icon === "car" && "🚗"}
        {icon === "device" && "🎵"}
      </span>
    );
  };

  // Loading state
  if (isLoadingDevices && devices.length === 0) {
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span className="text-foreground/70">Finding devices...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (deviceError) {
    const isRateLimit = deviceError.toLowerCase().includes("rate") || deviceError.toLowerCase().includes("exceeded");
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-2">
          <p className="text-red-400 text-sm">
            {isRateLimit ? "Spotify rate limit hit — retrying in 5s..." : deviceError}
          </p>
          <button
            onClick={() => {
              clearDeviceError();
              fetchDevices();
            }}
            className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
          >
            Retry Now
          </button>
        </div>
      </div>
    );
  }

  // No devices found
  if (devices.length === 0) {
    return (
      <div className="p-4 bg-surface rounded-lg">
        <div className="flex flex-col gap-3">
          <p className="text-foreground/70">No devices found</p>
          <p className="text-sm text-foreground/50">
            Open Spotify on a device to make it available
          </p>
          <button
            onClick={() => fetchDevices()}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface text-foreground rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg overflow-hidden">
      <div className="p-3 border-b border-surface-elevated flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground/70">Select Device</h3>
        <button
          onClick={() => fetchDevices()}
          disabled={isLoadingDevices}
          className="p-1 text-foreground/50 hover:text-foreground transition-colors disabled:opacity-50"
          aria-label="Refresh devices"
        >
          <svg
            className={`w-4 h-4 ${isLoadingDevices ? "animate-spin" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
      <ul className="divide-y divide-surface-elevated">
        {devices.map((device) => (
          <li key={device.id}>
            <button
              onClick={() => device.id && selectDevice(device.id)}
              disabled={!device.id || device.is_active || isLoadingDevices}
              className={`w-full p-3 flex items-center gap-3 text-left transition-colors ${
                device.is_active
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-surface-elevated"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <DeviceIcon type={device.type} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {device.name}
                  {isSonosDevice(device) && (
                    <span className="ml-2 text-xs text-accent-cyan">Sonos</span>
                  )}
                </p>
                <p className="text-xs text-foreground/50 capitalize">
                  {device.type}
                  {device.volume_percent !== null &&
                    ` • ${device.volume_percent}%`}
                </p>
              </div>
              {device.is_active && (
                <span className="text-xs text-primary font-medium">Active</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
