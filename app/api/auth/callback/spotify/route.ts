// OAuth callback handler for Spotify PKCE flow
// Exchanges code for tokens and redirects to app

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Use request origin to determine app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

  // Handle OAuth errors
  if (error) {
    console.error("Spotify OAuth error:", error);
    return NextResponse.redirect(
      `${appUrl}?error=${encodeURIComponent(error)}`
    );
  }

  // Validate code exists
  if (!code) {
    return NextResponse.redirect(
      `${appUrl}?error=${encodeURIComponent("No authorization code received")}`
    );
  }

  // Token exchange happens client-side (PKCE flow)
  // We just redirect with the code - client will exchange it
  return NextResponse.redirect(
    `${appUrl}?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state || "")}`
  );
}
