import { NextRequest, NextResponse } from "next/server";
import { SpotifyApi } from "@spotify/web-api-ts-sdk";
import { curateTracklist } from "@/lib/ai";
import { Track } from "@/lib/spotify/types";

// Hard cap on total function execution — prevents SDK retry loops from hanging
export const maxDuration = 25;

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!;

// Search for a single track by artist + title using Spotify field filters.
// Uses raw fetch instead of the SDK to bypass the SDK's internal retry-with-Retry-After
// behaviour, which can hold the response for minutes when rate limited.
async function searchTrackServer(
  accessToken: string,
  artist: string,
  title: string,
  signal: AbortSignal
): Promise<Track | null> {
  const queries = [
    `track:"${title}" artist:"${artist}"`,
    `${title} ${artist}`,
  ];

  for (const q of queries) {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=1`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal,
      });
      if (!res.ok) continue; // 429, 404, etc — just skip this track
      const data = await res.json();
      const item = data?.tracks?.items?.[0];
      if (!item) continue;
      return {
        id: item.id,
        name: item.name,
        artists: item.artists.map((a: { id: string; name: string }) => ({
          id: a.id,
          name: a.name,
        })),
        album: {
          id: item.album.id,
          name: item.album.name,
          images: item.album.images.map(
            (img: { url: string; width: number; height: number }) => ({
              url: img.url,
              width: img.width ?? 0,
              height: img.height ?? 0,
            })
          ),
        },
        durationMs: item.duration_ms,
      };
    } catch {
      // AbortError or network error — stop trying
      return null;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, accessToken } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Step 1: Ask Claude to curate a track list
    const result = await curateTracklist(message, context);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, responseTimeMs: result.responseTimeMs },
        { status: 500 }
      );
    }

    if (result.needsClarification) {
      return NextResponse.json({
        needsClarification: true,
        clarification: result.clarification,
        responseTimeMs: result.responseTimeMs,
      });
    }

    const suggested = result.tracks ?? [];

    // Step 2: Validate tracks against Spotify — skip this if no token provided
    // Uses raw fetch with a 15s abort so we never hang on rate-limited searches
    let validatedTracks: Track[] = [];

    if (accessToken && suggested.length > 0) {
      const controller = new AbortController();
      const searchTimeout = setTimeout(() => controller.abort(), 15000);

      try {
        const BATCH = 5;
        const seen = new Set<string>();

        for (let i = 0; i < suggested.length && validatedTracks.length < 15; i += BATCH) {
          if (controller.signal.aborted) break;
          const batch = suggested.slice(i, i + BATCH);
          const results = await Promise.all(
            batch.map((s) =>
              searchTrackServer(accessToken, s.artist, s.title, controller.signal)
            )
          );
          for (const track of results) {
            if (track && !seen.has(track.id)) {
              validatedTracks.push(track);
              seen.add(track.id);
            }
          }
        }
      } finally {
        clearTimeout(searchTimeout);
      }
    }

    return NextResponse.json({
      needsClarification: false,
      tracks: validatedTracks,
      suggested: validatedTracks.length === 0 ? suggested : undefined,
      curatorNote: result.curatorNote,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
