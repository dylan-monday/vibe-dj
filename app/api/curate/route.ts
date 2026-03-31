import { NextRequest, NextResponse } from "next/server";
import { curateTracklist } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

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

    return NextResponse.json({
      needsClarification: false,
      tracks: result.tracks,
      curatorNote: result.curatorNote,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
