// Playback state store using Zustand
// Manages device selection and playback state

import { create } from "zustand";
import { SpotifyDevice, PlaybackState } from "@/lib/spotify/types";
import {
  getDevices,
  transferPlayback,
  SpotifyApiError,
} from "@/lib/spotify/devices";
import {
  play as apiPlay,
  pause as apiPause,
  skipNext as apiSkipNext,
  skipPrevious as apiSkipPrevious,
  setVolume as apiSetVolume,
  seekToPosition as apiSeekToPosition,
} from "@/lib/spotify/playback";

interface PlaybackStore {
  // Device state
  devices: SpotifyDevice[];
  activeDevice: SpotifyDevice | null;
  isLoadingDevices: boolean;
  deviceError: string | null;

  // Playback state
  playbackState: PlaybackState | null;
  currentTrack: PlaybackState['track'] | null;
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  volume: number;
  lastPolledAt: number | null;
  isStale: boolean;

  // Polling control
  pollingInterval: number;
  isPolling: boolean;

  // Error state
  playbackError: string | null;

  // Actions - Device management
  fetchDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  clearDeviceError: () => void;

  // Actions - State updates (called by polling hook)
  updatePlaybackState: (state: PlaybackState | null) => void;
  setPlaybackState: (state: PlaybackState | null) => void;
  setProgress: (ms: number) => void;
  markStale: () => void;

  // Actions - Playback controls (call API + optimistic update)
  togglePlayPause: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  changeVolume: (percent: number) => Promise<void>;
  seekTo: (positionMs: number) => Promise<void>;

  // Actions - Polling control
  startPolling: () => void;
  stopPolling: () => void;
  setPollingInterval: (ms: number) => void;
}

// Persist selected device across sessions
const DEVICE_KEY = "vibe-dj-active-device";

function saveDevice(device: SpotifyDevice): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEVICE_KEY, JSON.stringify(device));
  }
}

function loadSavedDevice(): SpotifyDevice | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// Debounce helper for volume changes
let volumeDebounceTimer: NodeJS.Timeout | null = null;

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Initial state - Device management
  devices: [],
  activeDevice: null,
  isLoadingDevices: false,
  deviceError: null,

  // Playback state
  playbackState: null,
  currentTrack: null,
  isPlaying: false,
  progressMs: 0,
  durationMs: 0,
  volume: 0,
  lastPolledAt: null,
  isStale: false,

  // Polling control
  pollingInterval: 3000,
  isPolling: false,

  // Error state
  playbackError: null,

  // Fetch available devices
  fetchDevices: async () => {
    // If we have a saved device, use it immediately — no API call needed
    const savedDevice = loadSavedDevice();
    if (savedDevice) {
      set({ activeDevice: savedDevice, devices: [savedDevice], isLoadingDevices: false });
      return;
    }

    // No saved device — need to ask Spotify
    set({ isLoadingDevices: true, deviceError: null });

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new SpotifyApiError("Request timed out — open Spotify on a device first", 408)), 8000)
      );
      const devices = await Promise.race([getDevices(), timeout]);
      const active = devices.find((d) => d.is_active) || null;
      if (active) saveDevice(active);
      set({ devices, activeDevice: active, isLoadingDevices: false });
    } catch (error) {
      const message = error instanceof SpotifyApiError ? error.message : "Failed to fetch devices";
      set({ isLoadingDevices: false, deviceError: message });
    }
  },

  // Select and transfer playback to device
  selectDevice: async (deviceId: string) => {
    const { devices } = get();
    const device = devices.find((d) => d.id === deviceId);

    if (!device) {
      set({ deviceError: "Device not found" });
      return;
    }

    set({ isLoadingDevices: true, deviceError: null });

    try {
      await transferPlayback(deviceId, false);

      // Persist selection and update state
      saveDevice(device);
      set({
        activeDevice: device,
        devices: devices.map((d) => ({
          ...d,
          is_active: d.id === deviceId,
        })),
        isLoadingDevices: false,
      });
    } catch (error) {
      const message =
        error instanceof SpotifyApiError
          ? error.message
          : "Failed to transfer playback";

      set({
        isLoadingDevices: false,
        deviceError: message,
      });
    }
  },

  clearDeviceError: () => set({ deviceError: null }),

  // State updates (called by polling hook)
  updatePlaybackState: (state) => {
    const now = Date.now();
    set({
      playbackState: state,
      currentTrack: state?.track || null,
      isPlaying: state?.isPlaying || false,
      progressMs: state?.progressMs || 0,
      durationMs: state?.track?.durationMs || 0,
      volume: state?.device?.volume_percent || get().volume,
      lastPolledAt: now,
      isStale: false,
      playbackError: null,
    });
  },

  setPlaybackState: (state) => {
    const now = Date.now();
    const lastPolled = get().lastPolledAt;
    const isStale = lastPolled ? now - lastPolled > 10000 : false;

    set({
      playbackState: state,
      currentTrack: state?.track || null,
      isPlaying: state?.isPlaying || false,
      progressMs: state?.progressMs || 0,
      durationMs: state?.track?.durationMs || 0,
      volume: state?.device?.volume_percent || 0,
      lastPolledAt: now,
      isStale,
    });
  },

  setProgress: (ms: number) => {
    set({ progressMs: ms });
  },

  markStale: () => {
    set({ isStale: true });
  },

  // Playback controls with optimistic updates
  togglePlayPause: async () => {
    const { isPlaying, activeDevice } = get();
    const newState = !isPlaying;
    const deviceId = activeDevice?.id ?? undefined;

    // Optimistic update
    set({ isPlaying: newState, playbackError: null });

    try {
      if (newState) {
        await apiPlay(deviceId);
      } else {
        await apiPause(deviceId);
      }
    } catch (error) {
      // Revert on error
      console.error("Toggle play/pause failed:", error);
      set({
        isPlaying,
        playbackError: error instanceof SpotifyApiError
          ? error.message
          : "Failed to toggle playback",
      });
    }
  },

  skipToNext: async () => {
    const { activeDevice } = get();
    const deviceId = activeDevice?.id ?? undefined;
    set({ playbackError: null });

    try {
      await apiSkipNext(deviceId);
      // Don't optimistically update - let polling handle it
    } catch (error) {
      console.error("Skip next failed:", error);
      set({
        playbackError: error instanceof SpotifyApiError
          ? error.message
          : "Failed to skip to next track",
      });
    }
  },

  skipToPrevious: async () => {
    const { activeDevice } = get();
    const deviceId = activeDevice?.id ?? undefined;
    set({ playbackError: null });

    try {
      await apiSkipPrevious(deviceId);
      // Don't optimistically update - let polling handle it
    } catch (error) {
      console.error("Skip previous failed:", error);
      set({
        playbackError: error instanceof SpotifyApiError
          ? error.message
          : "Failed to skip to previous track",
      });
    }
  },

  changeVolume: async (percent: number) => {
    // Clamp to 0-100
    const clampedPercent = Math.max(0, Math.min(100, percent));

    // Optimistic update
    set({ volume: clampedPercent, playbackError: null });

    // Debounce API call to avoid spamming Spotify
    if (volumeDebounceTimer) {
      clearTimeout(volumeDebounceTimer);
    }

    volumeDebounceTimer = setTimeout(async () => {
      try {
        await apiSetVolume(clampedPercent);
      } catch (error) {
        set({
          playbackError: error instanceof SpotifyApiError
            ? error.message
            : "Failed to change volume",
        });
      }
    }, 300); // 300ms debounce
  },

  seekTo: async (positionMs: number) => {
    // Optimistic update
    set({ progressMs: positionMs, playbackError: null });

    try {
      await apiSeekToPosition(positionMs);
    } catch (error) {
      set({
        playbackError: error instanceof SpotifyApiError
          ? error.message
          : "Failed to seek",
      });
    }
  },

  // Polling control
  startPolling: () => {
    set({ isPolling: true });
  },

  stopPolling: () => {
    set({ isPolling: false });
  },

  setPollingInterval: (ms: number) => {
    set({ pollingInterval: ms });
  },
}));
