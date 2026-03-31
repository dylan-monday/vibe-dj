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
