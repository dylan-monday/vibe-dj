import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface VoiceStore {
  isEnabled: boolean;
  volume: number;
  currentAudio: HTMLAudioElement | null;

  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  playVoice: (audioData: ArrayBuffer) => Promise<void>;
  stopVoice: () => void;
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      isEnabled: false, // Disabled by default
      volume: 0.8,
      currentAudio: null,

      setEnabled: (enabled) => set({ isEnabled: enabled }),

      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      playVoice: async (audioData) => {
        const { isEnabled, volume, currentAudio } = get();

        if (!isEnabled) return;

        // Stop any current playback
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.src = "";
        }

        // Create audio from buffer
        const blob = new Blob([audioData], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.volume = volume;

        set({ currentAudio: audio });

        return new Promise((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            set({ currentAudio: null });
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            set({ currentAudio: null });
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      },

      stopVoice: () => {
        const { currentAudio } = get();
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.src = "";
          set({ currentAudio: null });
        }
      },
    }),
    {
      name: "vibe-dj-voice",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isEnabled: state.isEnabled,
        volume: state.volume,
      }),
    }
  )
);
