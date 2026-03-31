import { create } from "zustand";

interface ThemeStore {
  accentColor: string;
  previousAccentColor: string;
  isTransitioning: boolean;

  setAccentColor: (color: string) => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  accentColor: "#7c3aed", // Default purple
  previousAccentColor: "#7c3aed",
  isTransitioning: false,

  setAccentColor: (color) => {
    const current = get().accentColor;
    if (current !== color) {
      set({
        previousAccentColor: current,
        accentColor: color,
        isTransitioning: true,
      });

      // Clear transition flag after animation
      setTimeout(() => set({ isTransitioning: false }), 500);
    }
  },
}));
