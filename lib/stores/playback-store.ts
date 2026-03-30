// Playback state store using Zustand
// Manages device selection and playback state

import { create } from "zustand";
import { SpotifyDevice, PlaybackState } from "@/lib/spotify/types";
import {
  getDevices,
  transferPlayback,
  SpotifyApiError,
} from "@/lib/spotify/devices";

interface PlaybackStore {
  // Device state
  devices: SpotifyDevice[];
  activeDevice: SpotifyDevice | null;
  isLoadingDevices: boolean;
  deviceError: string | null;

  // Playback state (to be expanded in Phase 2)
  playbackState: PlaybackState | null;
  isPolling: boolean;

  // Actions
  fetchDevices: () => Promise<void>;
  selectDevice: (deviceId: string) => Promise<void>;
  clearDeviceError: () => void;
  setPlaybackState: (state: PlaybackState | null) => void;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  // Initial state
  devices: [],
  activeDevice: null,
  isLoadingDevices: false,
  deviceError: null,
  playbackState: null,
  isPolling: false,

  // Fetch available devices
  fetchDevices: async () => {
    set({ isLoadingDevices: true, deviceError: null });

    try {
      const devices = await getDevices();
      const active = devices.find((d) => d.is_active) || null;

      set({
        devices,
        activeDevice: active,
        isLoadingDevices: false,
      });
    } catch (error) {
      const message =
        error instanceof SpotifyApiError
          ? error.message
          : "Failed to fetch devices";

      set({
        isLoadingDevices: false,
        deviceError: message,
      });
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

      // Update active device optimistically
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
  setPlaybackState: (state) => set({ playbackState: state }),
}));
