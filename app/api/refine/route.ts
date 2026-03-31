import { NextRequest, NextResponse } from "next/server";
import { detectRefinement } from "@/lib/ai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, currentVibe } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const result = await detectRefinement(message, currentVibe);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, responseTimeMs: result.responseTimeMs },
        { status: 500 }
      );
    }

    return NextResponse.json({
      refinement: result.refinement,
      responseTimeMs: result.responseTimeMs,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
