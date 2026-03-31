---
phase: 10
plan: 1
title: Dynamic Colors and Animations
wave: 1
depends_on: [02-01-playback-state]
files_modified:
  - lib/utils/color-extraction.ts
  - lib/stores/theme-store.ts
  - lib/stores/index.ts
  - components/ui/motion.tsx
  - components/player/animated-album-art.tsx
requirements_addressed: [UI-02, UI-04]
autonomous: true
---

<objective>
Add dynamic accent colors extracted from album art and spring animations.

Purpose: Interface feels alive and responsive to the current track.
Output: Color extraction, theme store, motion components.
</objective>

<must_haves>
- Extract dominant color from album art
- Smooth color transitions on track change
- Spring animations for key UI elements
- Motion wrapper components for reuse
</must_haves>

<task id="1">
<title>Create Color Extraction Utility</title>
<action>
Create lib/utils/color-extraction.ts:

```typescript
// Extract dominant color from album art image

interface RGB {
  r: number;
  g: number;
  b: number;
}

export async function extractDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve("#7c3aed"); // Fallback purple
        return;
      }

      // Sample at low resolution for performance
      const size = 10;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size).data;
      const colors: RGB[] = [];

      // Collect all pixel colors
      for (let i = 0; i < imageData.length; i += 4) {
        colors.push({
          r: imageData[i],
          g: imageData[i + 1],
          b: imageData[i + 2],
        });
      }

      // Find most vibrant color (avoid dark/white)
      const vibrant = colors
        .filter((c) => {
          const brightness = (c.r + c.g + c.b) / 3;
          const saturation = Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b);
          return brightness > 30 && brightness < 220 && saturation > 30;
        })
        .sort((a, b) => {
          const satA = Math.max(a.r, a.g, a.b) - Math.min(a.r, a.g, a.b);
          const satB = Math.max(b.r, b.g, b.b) - Math.min(b.r, b.g, b.b);
          return satB - satA;
        })[0];

      if (vibrant) {
        resolve(`rgb(${vibrant.r}, ${vibrant.g}, ${vibrant.b})`);
      } else {
        resolve("#7c3aed"); // Fallback purple
      }
    };

    img.onerror = () => resolve("#7c3aed");
    img.src = imageUrl;
  });
}
```
</action>
<acceptance_criteria>
- Extracts color from image URL
- Returns most vibrant color
- Falls back gracefully on error
</acceptance_criteria>
</task>

<task id="2">
<title>Create Theme Store</title>
<action>
Create lib/stores/theme-store.ts:

```typescript
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
```
</action>
<acceptance_criteria>
- Tracks current and previous accent color
- Transition state for animations
</acceptance_criteria>
</task>

<task id="3">
<title>Update Stores Index</title>
<action>
Add to lib/stores/index.ts:

```typescript
export { useThemeStore } from "./theme-store";
```
</action>
<acceptance_criteria>
- Theme store exported
</acceptance_criteria>
</task>

<task id="4">
<title>Create Motion Components</title>
<action>
Create components/ui/motion.tsx:

```typescript
"use client";

import { motion, type MotionProps } from "framer-motion";
import { forwardRef, type ComponentProps } from "react";

// Spring config for snappy feel
export const springConfig = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

// Soft spring for slower animations
export const softSpring = {
  type: "spring" as const,
  stiffness: 200,
  damping: 25,
};

// Fade in animation
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

// Scale up animation
export const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
  transition: springConfig,
};

// Slide up animation
export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: springConfig,
};

// Motion div with common animations
export const MotionDiv = motion.div;

// Motion button with tap animation
export const MotionButton = forwardRef<
  HTMLButtonElement,
  ComponentProps<typeof motion.button>
>((props, ref) => (
  <motion.button
    ref={ref}
    whileTap={{ scale: 0.97 }}
    transition={springConfig}
    {...props}
  />
));
MotionButton.displayName = "MotionButton";
```
</action>
<acceptance_criteria>
- Spring configs exported
- Animation presets available
- Reusable motion components
</acceptance_criteria>
</task>

<task id="5">
<title>Create Animated Album Art</title>
<action>
Create components/player/animated-album-art.tsx:

```typescript
"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { usePlaybackStore, useThemeStore } from "@/lib/stores";
import { extractDominantColor } from "@/lib/utils/color-extraction";
import { softSpring } from "@/components/ui/motion";

export function AnimatedAlbumArt() {
  const { currentTrack } = usePlaybackStore();
  const { accentColor, setAccentColor } = useThemeStore();

  const imageUrl = currentTrack?.album?.images?.[0]?.url;

  // Extract color when track changes
  useEffect(() => {
    if (imageUrl) {
      extractDominantColor(imageUrl).then(setAccentColor);
    }
  }, [imageUrl, setAccentColor]);

  if (!imageUrl) {
    return (
      <div
        className="aspect-square w-full rounded-2xl bg-zinc-800"
        style={{ boxShadow: `0 20px 60px -10px ${accentColor}40` }}
      />
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentTrack?.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={softSpring}
        className="relative aspect-square w-full overflow-hidden rounded-2xl"
        style={{
          boxShadow: `0 20px 60px -10px ${accentColor}60`,
        }}
      >
        <Image
          src={imageUrl}
          alt={currentTrack?.name || "Album art"}
          fill
          className="object-cover"
          priority
        />
      </motion.div>
    </AnimatePresence>
  );
}
```
</action>
<acceptance_criteria>
- Album art animates on track change
- Color extraction triggers on new track
- Dynamic shadow based on accent color
</acceptance_criteria>
</task>

<verification>
```bash
npx tsc --noEmit
npm run build
```
</verification>
