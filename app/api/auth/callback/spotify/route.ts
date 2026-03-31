// OAuth callback handler for Spotify PKCE flow
// Exchanges code for tokens and redirects to app

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Use the actual Host header to preserve 127.0.0.1 vs localhost distinction
  // This is critical for Spotify OAuth which requires exact redirect_uri match
  const host = request.headers.get("host") || request.nextUrl.host;
  const protocol = request.nextUrl.protocol;
  const appUrl = `${protocol}//${host}`;
  console.log("[OAuth Callback] Redirecting to:", appUrl);

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
