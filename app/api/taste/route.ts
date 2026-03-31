import { NextRequest, NextResponse } from "next/server";
import {
  getPermanentExclusions,
  addPermanentGenreExclusion,
  removePermanentGenreExclusion,
  addPermanentArtistExclusion,
  removePermanentArtistExclusion,
  clearTasteProfile,
} from "@/lib/db/taste-profile";

// GET /api/taste - Get current taste profile
export async function GET() {
  try {
    const exclusions = await getPermanentExclusions();
    return NextResponse.json(exclusions);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get taste profile";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/taste - Add exclusion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, genre, artistId, artistName } = body;

    if (type === "genre" && genre) {
      await addPermanentGenreExclusion(genre);
      return NextResponse.json({ success: true, message: `"${genre}" will be excluded from future sessions` });
    }

    if (type === "artist" && artistId && artistName) {
      await addPermanentArtistExclusion(artistId, artistName);
      return NextResponse.json({ success: true, message: `"${artistName}" will be excluded from future sessions` });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add exclusion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/taste - Remove exclusion or clear all
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get("clear") === "all";

    if (clearAll) {
      await clearTasteProfile();
      return NextResponse.json({ success: true, message: "Taste profile cleared" });
    }

    const type = searchParams.get("type");
    const genre = searchParams.get("genre");
    const artistId = searchParams.get("artistId");

    if (type === "genre" && genre) {
      await removePermanentGenreExclusion(genre);
      return NextResponse.json({ success: true });
    }

    if (type === "artist" && artistId) {
      await removePermanentArtistExclusion(artistId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to remove exclusion";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
