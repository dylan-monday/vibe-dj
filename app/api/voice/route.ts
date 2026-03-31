import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/voice/elevenlabs";
import { generateCommentary } from "@/lib/voice/commentary";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trackName, artistName, albumName, genres, energy, isFirst } = body;

    if (!trackName || !artistName) {
      return NextResponse.json(
        { error: "trackName and artistName required" },
        { status: 400 }
      );
    }

    // Generate commentary
    const commentary = generateCommentary({
      trackName,
      artistName,
      albumName,
      genres,
      energy,
      isFirst,
    });

    // Synthesize speech
    const audioData = await synthesizeSpeech(commentary);

    if (!audioData) {
      return NextResponse.json(
        { error: "Voice synthesis unavailable", commentary },
        { status: 503 }
      );
    }

    // Return audio as binary
    return new NextResponse(audioData, {
      headers: {
        "Content-Type": "audio/mpeg",
        "X-Commentary": encodeURIComponent(commentary),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Voice generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
