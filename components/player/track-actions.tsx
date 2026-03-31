"use client";

import { useState, useEffect } from "react";
import { usePlaybackStore } from "@/lib/stores/playback-store";
import { checkSavedTracks, saveTracks, removeSavedTracks } from "@/lib/spotify";

interface TrackActionsProps {
  onMoreLikeThis?: () => void;
  onLessLikeThis?: () => void;
  isFeedbackLoading?: boolean;
}

export function TrackActions({
  onMoreLikeThis,
  onLessLikeThis,
  isFeedbackLoading = false,
}: TrackActionsProps) {
  const { currentTrack } = usePlaybackStore();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if current track is liked when track changes
  useEffect(() => {
    if (!currentTrack?.id) {
      setIsLiked(false);
      return;
    }

    const checkLiked = async () => {
      try {
        const [liked] = await checkSavedTracks([currentTrack.id]);
        setIsLiked(liked);
      } catch {
        // Silently fail - not critical
      }
    };

    checkLiked();
  }, [currentTrack?.id]);

  const handleToggleLike = async () => {
    if (!currentTrack?.id || isLoading) return;

    setIsLoading(true);
    try {
      if (isLiked) {
        await removeSavedTracks([currentTrack.id]);
        setIsLiked(false);
      } else {
        await saveTracks([currentTrack.id]);
        setIsLiked(true);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentTrack) {
    return null;
  }

  return (
    <div className="flex items-center gap-1">
      {/* Less like this */}
      {onLessLikeThis && (
        <button
          onClick={onLessLikeThis}
          disabled={isFeedbackLoading}
          className={`
            p-2 rounded-full transition-all duration-200
            text-foreground/60 hover:text-red-400
            ${isFeedbackLoading ? "opacity-50 cursor-not-allowed" : ""}
            active:scale-95
          `}
          aria-label="Less like this"
          title="Less like this"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5"
            />
          </svg>
        </button>
      )}

      {/* Like / Save to library */}
      <button
        onClick={handleToggleLike}
        disabled={isLoading}
        className={`
          p-2 rounded-full transition-all duration-200
          ${isLiked ? "text-primary" : "text-foreground/60 hover:text-foreground"}
          ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
          active:scale-95
        `}
        aria-label={isLiked ? "Unlike track" : "Like track"}
        title={isLiked ? "Remove from Liked Songs" : "Add to Liked Songs"}
      >
        <svg
          className="w-5 h-5"
          fill={isLiked ? "currentColor" : "none"}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={isLiked ? 0 : 2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* More like this */}
      {onMoreLikeThis && (
        <button
          onClick={onMoreLikeThis}
          disabled={isFeedbackLoading}
          className={`
            p-2 rounded-full transition-all duration-200
            text-foreground/60 hover:text-green-400
            ${isFeedbackLoading ? "opacity-50 cursor-not-allowed" : ""}
            active:scale-95
          `}
          aria-label="More like this"
          title="More like this"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-.485-.06l-3.76-.94m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M4 15h2a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2z"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
