"use client";

import Image from "next/image";

interface AlbumArtProps {
  imageUrl: string | null;
  albumName: string;
  size?: "sm" | "md" | "lg" | "hero";
}

export function AlbumArt({ imageUrl, albumName, size = "hero" }: AlbumArtProps) {
  // Size mapping - hero is the primary mobile-first size
  const sizeClasses = {
    sm: "w-12 h-12",        // 48px - for queue items
    md: "w-16 h-16",        // 64px - for history items
    lg: "w-24 h-24",        // 96px - for detail views
    hero: "w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] aspect-square",
  };

  // Placeholder when no image
  if (!imageUrl) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg bg-surface-elevated flex items-center justify-center`}
        role="img"
        aria-label={`Album art for ${albumName}`}
      >
        <svg
          className="w-1/3 h-1/3 text-foreground/30"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} relative rounded-lg overflow-hidden shadow-2xl`}
    >
      <Image
        src={imageUrl}
        alt={`Album art for ${albumName}`}
        fill
        className="object-cover"
        sizes={size === "hero" ? "(max-width: 640px) 280px, (max-width: 768px) 320px, 400px" : undefined}
        priority={size === "hero"}
      />
      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
    </div>
  );
}
